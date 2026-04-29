import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { type GoogleSignupPayload } from './auth.service';
import { type ConsumerSignup } from './dto';
import { PrismaService } from '../../shared/prisma.service';
import { passwordUtils } from '../../shared-common';

@Injectable()
export class ConsumerAuthSignupService {
  private static readonly entitySignupDateOfBirthPlaceholder = new Date(0);
  private static readonly entitySignupPassportPlaceholder = `ENTITY_SIGNUP_NOT_APPLICABLE`;
  private static readonly entitySignupCitizenshipPlaceholder = `ENTITY_SIGNUP_NOT_APPLICABLE`;

  constructor(private readonly prisma: PrismaService) {}

  async signup(dto: ConsumerSignup, googleSignupPayload?: GoogleSignupPayload) {
    this.ensureBusinessRules(dto);

    const email = (googleSignupPayload?.email ?? dto.email).toLowerCase();
    if (googleSignupPayload && dto.email && dto.email.toLowerCase() !== email) {
      throw new BadRequestException(errorCodes.EMAIL_MISMATCH_GOOGLE);
    }

    const existing = await this.prisma.consumerModel.findFirst({
      where: { email },
      select: { id: true, deletedAt: true },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException(errorCodes.EMAIL_ALREADY_REGISTERED_SIGNUP);
    }

    let hash: string | null = null;
    let salt: string | null = null;
    if (!googleSignupPayload) {
      const trimmedPasswordLength = dto.password?.trim().length ?? 0;
      if (trimmedPasswordLength < 8) {
        throw new BadRequestException(errorCodes.PASSWORD_REQUIREMENTS);
      }
      const hashed = await passwordUtils.hashPassword(dto.password);
      hash = hashed.hash;
      salt = hashed.salt;
    }

    try {
      const personalDetailsCreate = this.buildSignupPersonalDetailsCreate(dto);
      const personalDetails = personalDetailsCreate ? { create: personalDetailsCreate } : undefined;

      let organizationDetails;
      if (dto.organizationDetails) {
        organizationDetails = {
          create: {
            name: dto.organizationDetails.name,
            consumerRole: dto.organizationDetails.consumerRole,
            size: dto.organizationDetails.size,
          },
        };
      }

      let addressDetails;
      if (dto.addressDetails) {
        addressDetails = {
          create: {
            postalCode: dto.addressDetails.postalCode,
            country: dto.addressDetails.country,
            city: dto.addressDetails.city ?? null,
            state: dto.addressDetails.state ?? null,
            street: dto.addressDetails.street ?? null,
          },
        };
      }

      const consumer = await this.prisma.consumerModel.create({
        data: {
          email,
          accountType: dto.accountType,
          contractorKind: dto.accountType === $Enums.AccountType.CONTRACTOR ? (dto.contractorKind ?? null) : null,
          ...(hash != null && salt != null ? { password: hash, salt } : {}),
          verified: googleSignupPayload ? true : false,
          legalVerified: false,
          howDidHearAboutUs: dto.howDidHearAboutUs ?? null,
          howDidHearAboutUsOther: dto.howDidHearAboutUsOther ?? null,
          ...(addressDetails && { addressDetails }),
          ...(personalDetails && { personalDetails }),
          ...(organizationDetails && { organizationDetails }),
        },
        include: { addressDetails: true, personalDetails: true, organizationDetails: true },
      });

      if (googleSignupPayload) {
        await this.upsertGoogleProfileDetailsFromSignup(consumer.id, googleSignupPayload);
      }

      return consumer;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        throw new ConflictException(errorCodes.EMAIL_ALREADY_REGISTERED_PRISMA);
      }
      throw err;
    }
  }

  private ensureBusinessRules(dto: ConsumerSignup) {
    const isIndividualContractor =
      dto.accountType === $Enums.AccountType.CONTRACTOR && dto.contractorKind === $Enums.ContractorKind.INDIVIDUAL;

    if (dto.accountType === $Enums.AccountType.CONTRACTOR && !dto.contractorKind) {
      throw new BadRequestException(errorCodes.CONTRACTOR_KIND_REQUIRED);
    }

    if (dto.accountType === $Enums.AccountType.BUSINESS && dto.contractorKind !== undefined) {
      throw new BadRequestException(errorCodes.CONTRACTOR_KIND_NOT_FOR_BUSINESS);
    }

    if (isIndividualContractor && !dto.personalDetails) {
      throw new BadRequestException(errorCodes.PERSONAL_DETAILS_REQUIRED);
    }

    if (
      isIndividualContractor &&
      (!dto.personalDetails?.citizenOf?.trim() ||
        !dto.personalDetails?.dateOfBirth?.trim() ||
        !dto.personalDetails?.passportOrIdNumber?.trim())
    ) {
      throw new BadRequestException(errorCodes.PERSONAL_DETAILS_REQUIRED);
    }

    if (
      (dto.accountType === $Enums.AccountType.BUSINESS ||
        (dto.accountType === $Enums.AccountType.CONTRACTOR && dto.contractorKind === $Enums.ContractorKind.ENTITY)) &&
      !dto.organizationDetails
    ) {
      throw new BadRequestException(errorCodes.ORGANIZATION_DETAILS_REQUIRED);
    }
  }

  private buildSignupPersonalDetailsCreate(dto: ConsumerSignup) {
    if (!dto.personalDetails) return null;

    const isIndividualContractor =
      dto.accountType === $Enums.AccountType.CONTRACTOR && dto.contractorKind === $Enums.ContractorKind.INDIVIDUAL;

    if (isIndividualContractor) {
      return {
        legalStatus: dto.personalDetails.legalStatus ?? null,
        citizenOf: dto.personalDetails.citizenOf ?? null,
        dateOfBirth: dto.personalDetails.dateOfBirth ? new Date(dto.personalDetails.dateOfBirth) : null,
        passportOrIdNumber: dto.personalDetails.passportOrIdNumber ?? null,
        countryOfTaxResidence: dto.personalDetails.countryOfTaxResidence ?? null,
        taxId: dto.personalDetails.taxId ?? null,
        phoneNumber: dto.personalDetails.phoneNumber ?? null,
        firstName: dto.personalDetails.firstName ?? null,
        lastName: dto.personalDetails.lastName ?? null,
      };
    }

    return {
      legalStatus: dto.personalDetails.legalStatus ?? null,
      citizenOf:
        dto.personalDetails.citizenOf?.trim() ||
        dto.personalDetails.countryOfTaxResidence?.trim() ||
        dto.addressDetails.country?.trim() ||
        ConsumerAuthSignupService.entitySignupCitizenshipPlaceholder,
      dateOfBirth: dto.personalDetails.dateOfBirth
        ? new Date(dto.personalDetails.dateOfBirth)
        : new Date(ConsumerAuthSignupService.entitySignupDateOfBirthPlaceholder.getTime()),
      passportOrIdNumber:
        dto.personalDetails.passportOrIdNumber?.trim() || ConsumerAuthSignupService.entitySignupPassportPlaceholder,
      countryOfTaxResidence: dto.personalDetails.countryOfTaxResidence ?? null,
      taxId: dto.personalDetails.taxId ?? null,
      phoneNumber: dto.personalDetails.phoneNumber ?? null,
      firstName: dto.personalDetails.firstName ?? null,
      lastName: dto.personalDetails.lastName ?? null,
    };
  }

  private async upsertGoogleProfileDetailsFromSignup(consumerId: string, payload: GoogleSignupPayload) {
    const metadata = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;

    await this.prisma.googleProfileDetailsModel.upsert({
      where: { consumerId },
      update: {
        email: payload.email,
        emailVerified: payload.emailVerified,
        name: payload.name,
        givenName: payload.givenName,
        familyName: payload.familyName,
        picture: payload.picture,
        organization: payload.organization,
        metadata,
      },
      create: {
        email: payload.email,
        emailVerified: payload.emailVerified,
        name: payload.name,
        givenName: payload.givenName,
        familyName: payload.familyName,
        picture: payload.picture,
        organization: payload.organization,
        metadata,
        consumer: {
          connect: { id: consumerId },
        },
      },
    });
  }
}
