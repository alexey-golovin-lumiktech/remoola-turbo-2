import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import { ChangePasswordBody, UpdateConsumerProfileBody } from './dtos';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../../shared/auth-audit.service';
import { PrismaService } from '../../../shared/prisma.service';
import { passwordUtils } from '../../../shared-common';

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
    if (consumer.password == null || consumer.salt == null) {
      throw new BadRequestException(errorCodes.CONSUMER_NO_PASSWORD_SET);
    }
    const valid = await passwordUtils.verifyPassword({
      password: body.currentPassword,
      storedHash: consumer.password,
      storedSalt: consumer.salt,
    });
    if (!valid) {
      throw new BadRequestException(errorCodes.CURRENT_PASSWORD_INVALID);
    }
    const { hash, salt } = await passwordUtils.hashPassword(body.password);
    await this.prisma.$transaction([
      this.prisma.consumerModel.update({
        where: { id: consumerId },
        data: { password: hash, salt },
      }),
      this.prisma.authSessionModel.updateMany({
        where: { consumerId: consumer.id, revokedAt: null },
        data: { revokedAt: new Date(), invalidatedReason: `logout_all`, lastUsedAt: new Date() },
      }),
    ]);
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
    return this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: {
        personalDetails: true,
        addressDetails: true,
        organizationDetails: true,
      },
    });
  }

  async updateProfile(consumerId: string, body: UpdateConsumerProfileBody) {
    const updates: Record<string, unknown> = {};

    if (body.personalDetails) {
      const current = await this.prisma.personalDetailsModel.findFirst({ where: { consumerId } });
      const rawDob = body.personalDetails.dateOfBirth?.trim();
      const dateOfBirth =
        rawDob && !Number.isNaN(new Date(rawDob).getTime()) ? new Date(rawDob) : (current?.dateOfBirth ?? new Date(0));
      const patch = {
        firstName: body.personalDetails.firstName || current?.firstName,
        lastName: body.personalDetails.lastName || current?.lastName,
        citizenOf: body.personalDetails.citizenOf || current?.citizenOf,
        passportOrIdNumber: body.personalDetails.passportOrIdNumber || current?.passportOrIdNumber,
        legalStatus: body.personalDetails.legalStatus ?? current?.legalStatus ?? null,
        dateOfBirth,
        countryOfTaxResidence: body.personalDetails.countryOfTaxResidence || current?.countryOfTaxResidence,
        taxId: body.personalDetails.taxId || current?.taxId,
        phoneNumber: body.personalDetails.phoneNumber || current?.phoneNumber,
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
      const patch = {
        postalCode: body.addressDetails.postalCode ?? current?.postalCode ?? null,
        country: body.addressDetails.country ?? current?.country ?? null,
        city: body.addressDetails.city ?? current?.city ?? null,
        street: body.addressDetails.street ?? current?.street ?? null,
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
        name: body.organizationDetails.name || current?.name || ``,
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
      return await this.prisma.consumerModel.update({
        where: { id: consumerId },
        data: updates,
        include: {
          personalDetails: true,
          addressDetails: true,
          organizationDetails: true,
        },
      });
    } catch (error) {
      this.logger.error(`updateProfile failed`, {
        consumerId,
        error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
      });
      throw error;
    }
  }
}
