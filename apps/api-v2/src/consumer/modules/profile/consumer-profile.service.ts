import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import { ChangePasswordBody, UpdateConsumerProfileBody } from './dtos';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../../shared/auth-audit.service';
import { PrismaService } from '../../../shared/prisma.service';
import { buildConsumerVerificationState, passwordUtils } from '../../../shared-common';

@Injectable()
export class ConsumerProfileService {
  private readonly logger = new Logger(ConsumerProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authAudit: AuthAuditService,
  ) {}

  async changePassword(consumerId: string, body: ChangePasswordBody): Promise<void> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { id: true, email: true, password: true, salt: true },
    });
    if (!consumer) throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_COMPLETE_PROFILE);
    const hasStoredPassword = consumer.password != null && consumer.salt != null;
    const hasNoStoredPassword = consumer.password == null && consumer.salt == null;

    if (!hasStoredPassword && !hasNoStoredPassword) {
      throw new BadRequestException(errorCodes.CURRENT_PASSWORD_INVALID);
    }

    if (hasStoredPassword) {
      const storedHash = consumer.password!;
      const storedSalt = consumer.salt!;
      if (!body.currentPassword?.trim()) {
        throw new BadRequestException(errorCodes.CURRENT_PASSWORD_INVALID);
      }
      const valid = await passwordUtils.verifyPassword({
        password: body.currentPassword,
        storedHash,
        storedSalt,
      });
      if (!valid) {
        throw new BadRequestException(errorCodes.CURRENT_PASSWORD_INVALID);
      }
    }
    await this.persistPasswordAndRevokeSessions(consumer.id, body.password);
    await this.authAudit.recordAudit({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: consumer.id,
      email: consumer.email,
      event: AUTH_AUDIT_EVENTS.password_change,
    });
    await this.authAudit.recordAudit({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: consumer.id,
      email: consumer.email,
      event: AUTH_AUDIT_EVENTS.logout_all,
    });
  }

  async getProfile(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: {
        personalDetails: true,
        addressDetails: true,
        organizationDetails: true,
      },
    });

    return {
      ...this.buildSafeConsumerPayload(consumer),
      verification: buildConsumerVerificationState(consumer),
    };
  }

  async updateProfile(consumerId: string, body: UpdateConsumerProfileBody) {
    const updates: Record<string, unknown> = {};

    if (body.personalDetails) {
      const current = await this.prisma.personalDetailsModel.findFirst({ where: { consumerId } });
      const personalDetails = body.personalDetails;
      const rawDob = body.personalDetails.dateOfBirth?.trim();
      const dateOfBirth =
        rawDob && !Number.isNaN(new Date(rawDob).getTime()) ? new Date(rawDob) : (current?.dateOfBirth ?? new Date(0));
      const patch = {
        firstName:
          personalDetails.firstName !== undefined ? (personalDetails.firstName?.trim() ?? ``) : current?.firstName,
        lastName: personalDetails.lastName !== undefined ? (personalDetails.lastName?.trim() ?? ``) : current?.lastName,
        citizenOf: body.personalDetails.citizenOf || current?.citizenOf,
        passportOrIdNumber: body.personalDetails.passportOrIdNumber || current?.passportOrIdNumber,
        legalStatus: body.personalDetails.legalStatus ?? current?.legalStatus ?? null,
        dateOfBirth,
        countryOfTaxResidence: body.personalDetails.countryOfTaxResidence || current?.countryOfTaxResidence,
        taxId: body.personalDetails.taxId || current?.taxId,
        phoneNumber:
          personalDetails.phoneNumber !== undefined
            ? (personalDetails.phoneNumber?.trim() ?? ``)
            : current?.phoneNumber,
      };

      updates.personalDetails = {
        upsert: {
          create: patch,
          update: patch,
        },
      };
    }

    if (body.addressDetails) {
      const current = await this.prisma.addressDetailsModel.findFirst({ where: { consumerId } });
      const addressDetails = body.addressDetails;
      const patch = {
        postalCode:
          addressDetails.postalCode !== undefined ? (addressDetails.postalCode?.trim() ?? ``) : current?.postalCode,
        country: addressDetails.country !== undefined ? (addressDetails.country?.trim() ?? ``) : current?.country,
        city: addressDetails.city !== undefined ? (addressDetails.city?.trim() ?? ``) : current?.city,
        street: addressDetails.street !== undefined ? (addressDetails.street?.trim() ?? ``) : current?.street,
        state: body.addressDetails.state ?? current?.state ?? null,
      };

      updates.addressDetails = {
        upsert: {
          create: patch,
          update: patch,
        },
      };
    }

    if (body.organizationDetails) {
      const current = await this.prisma.organizationDetailsModel.findFirst({ where: { consumerId } });
      const consumerRole = body.organizationDetails.consumerRole ?? current?.consumerRole ?? null;
      const consumerRoleOther =
        consumerRole === `OTHER`
          ? (body.organizationDetails.consumerRoleOther ?? current?.consumerRoleOther ?? null)
          : null;
      const patch = {
        name:
          body.organizationDetails.name !== undefined
            ? (body.organizationDetails.name?.trim() ?? ``)
            : (current?.name ?? ``),
        consumerRole,
        consumerRoleOther,
        size: body.organizationDetails.size || current?.size || `SMALL`,
      };

      updates.organizationDetails = {
        upsert: {
          create: patch,
          update: patch,
        },
      };
    }

    try {
      const consumer = await this.prisma.consumerModel.update({
        where: { id: consumerId },
        data: updates,
        include: {
          personalDetails: true,
          addressDetails: true,
          organizationDetails: true,
        },
      });
      return this.buildSafeConsumerPayload(consumer);
    } catch (error) {
      this.logger.error(`updateProfile failed`, {
        consumerId,
        error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
      });
      throw error;
    }
  }

  private async persistPasswordAndRevokeSessions(consumerId: string, password: string) {
    const { hash, salt } = await passwordUtils.hashPassword(password);
    await this.prisma.$transaction([
      this.prisma.consumerModel.update({
        where: { id: consumerId },
        data: { password: hash, salt },
      }),
      this.prisma.authSessionModel.updateMany({
        where: { consumerId, revokedAt: null },
        data: { revokedAt: new Date(), invalidatedReason: `logout_all`, lastUsedAt: new Date() },
      }),
    ]);
  }

  private buildSafeConsumerPayload<
    T extends {
      password?: string | null;
      salt?: string | null;
    } | null,
  >(consumer: T) {
    if (!consumer) {
      return {
        hasPassword: false,
      };
    }

    const { password, salt, ...safeConsumer } = consumer;

    return {
      ...safeConsumer,
      hasPassword: password != null && salt != null,
    };
  }
}
