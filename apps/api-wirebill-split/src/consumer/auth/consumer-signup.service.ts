import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { Prisma, $Enums } from '@remoola/database';

import { ConsumerSignupGPT } from './dto';
import { PrismaService } from '../../shared/prisma.service';
import { passwordUtils } from '../../shared-common';

@Injectable()
export class ConsumerSignupServiceGPT {
  constructor(private readonly prisma: PrismaService) {}

  async signupGPT(dto: ConsumerSignupGPT) {
    this.ensureBusinessRules(dto);

    const existing = await this.prisma.consumerModel.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Email is already registered`);
    }

    const { hash, salt } = await passwordUtils.hashPassword(dto.password);

    try {
      let personalDetails;
      if (dto.personalDetails) {
        personalDetails = {
          create: {
            legalStatus: dto.personalDetails.legalStatus ?? null,
            citizenOf: dto.personalDetails.citizenOf,
            dateOfBirth: new Date(dto.personalDetails.dateOfBirth),
            passportOrIdNumber: dto.personalDetails.passportOrIdNumber,
            countryOfTaxResidence: dto.personalDetails.countryOfTaxResidence ?? null,
            taxId: dto.personalDetails.taxId ?? null,
            phoneNumber: dto.personalDetails.phoneNumber ?? null,
            firstName: dto.personalDetails.firstName ?? null,
            lastName: dto.personalDetails.lastName ?? null,
          },
        };
      }

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
          email: dto.email.toLowerCase(),
          accountType: dto.accountType,
          contractorKind: dto.accountType === $Enums.AccountType.CONTRACTOR ? (dto.contractorKind ?? null) : null,
          password: hash,
          salt,
          verified: false,
          legalVerified: false,
          howDidHearAboutUs: dto.howDidHearAboutUs ?? null,
          howDidHearAboutUsOther: dto.howDidHearAboutUsOther ?? null,
          ...(addressDetails && { addressDetails }),
          ...(personalDetails && { personalDetails }),
          ...(organizationDetails && { organizationDetails }),
        },
        include: { addressDetails: true, personalDetails: true, organizationDetails: true },
      });

      return consumer;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        // unique constraint violation (email)
        throw new ConflictException(`Email is already registered`);
      }
      throw err;
    }
  }

  /**
   * Enforce combinations of accountType / contractorKind
   * and required nested blocks.
   */
  private ensureBusinessRules(dto: ConsumerSignupGPT) {
    if (dto.accountType === $Enums.AccountType.CONTRACTOR && !dto.contractorKind) {
      throw new BadRequestException(`contractorKind is required for CONTRACTOR accountType`);
    }

    if (dto.accountType === $Enums.AccountType.BUSINESS && dto.contractorKind !== undefined) {
      throw new BadRequestException(`contractorKind must not be provided for BUSINESS accountType`);
    }

    // CONTRACTOR + INDIVIDUAL → personal required
    if (
      dto.accountType === $Enums.AccountType.CONTRACTOR &&
      dto.contractorKind === $Enums.ContractorKind.INDIVIDUAL &&
      !dto.personalDetails
    ) {
      throw new BadRequestException(`personal details are required for INDIVIDUAL contractor`);
    }

    // BUSINESS or CONTRACTOR + ENTITY → organization required
    if (
      (dto.accountType === $Enums.AccountType.BUSINESS ||
        (dto.accountType === $Enums.AccountType.CONTRACTOR && dto.contractorKind === $Enums.ContractorKind.ENTITY)) &&
      !dto.organizationDetails
    ) {
      throw new BadRequestException(`organization details are required for BUSINESS and ENTITY contractor`);
    }
  }
}
