import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type AddressDetails, type OrganizationDetails, type PersonalDetails } from '@remoola/database';

import {
  type PersonalDetailsUpsert,
  type AddressDetailsUpsert,
  type OrganizationDetailsUpsert,
  type SignupBody,
} from './dto';
import { envs } from '../../envs';
import { MailingService } from '../../shared/mailing.service';
import { PrismaService } from '../../shared/prisma.service';
import { passwordUtils } from '../../shared-common';

@Injectable()
export class SignupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailingService: MailingService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(body: SignupBody) {
    const exist = await this.prisma.consumer.findFirst({ where: { email: body.email } });
    if (exist) {
      if (envs.NODE_ENV === `production`) {
        throw new BadRequestException(`Email: "${body.email}" is already registered`);
      }

      return { consumerId: exist.id };
    }

    const salt = passwordUtils.getHashingSalt();
    const hash = passwordUtils.hashPassword({ password: body.password, salt });
    const consumer = await this.prisma.consumer.create({
      data: {
        salt: salt,
        email: body.email,
        password: hash,
        accountType: body.accountType,
        howDidHearAboutUs: body.howDidHearAboutUs,
        firstName: body.firstName,
        lastName: body.lastName,
        contractorKind: body.contractorKind,
      },
    });
    return { consumerId: consumer.id };
  }

  async personalDetails(consumerId: string, body: PersonalDetailsUpsert) {
    const exist = await this.prisma.personalDetails.findFirst({ where: { consumerId } });

    let personalDetails: PersonalDetails;
    const data = {
      citizenOf: body.citizenOf || null,
      dateOfBirth: body.dateOfBirth,
      passportOrIdNumber: body.passportOrIdNumber || null,
      countryOfTaxResidence: body.countryOfTaxResidence || null,
      taxId: body.taxId || null,
      phoneNumber: body.phoneNumber || null,
    };

    if (exist) {
      personalDetails = await this.prisma.personalDetails.update({
        where: { id: exist.id },
        data,
      });
    } else {
      personalDetails = await this.prisma.personalDetails.create({
        data: {
          consumer: { connect: { id: consumerId } },
          ...data,
        },
      });
    }

    return { personalDetailsId: personalDetails.id };
  }

  async addressDetails(consumerId: string, body: AddressDetailsUpsert) {
    const exist = await this.prisma.addressDetails.findFirst({ where: { consumerId } });

    let addressDetails: AddressDetails;
    if (exist) {
      addressDetails = await this.prisma.addressDetails.update({
        where: { id: exist.id },
        data: body,
      });
    } else {
      addressDetails = await this.prisma.addressDetails.create({
        data: {
          consumer: { connect: { id: consumerId } },
          ...body,
        },
      });
    }

    return { addressDetailsId: addressDetails.id };
  }

  async organizationDetails(consumerId: string, body: OrganizationDetailsUpsert) {
    const exist = await this.prisma.organizationDetails.findFirst({ where: { consumerId } });

    let organizationDetails: OrganizationDetails;
    if (exist) {
      organizationDetails = await this.prisma.organizationDetails.update({
        where: { id: exist.id },
        data: body,
      });
    } else {
      organizationDetails = await this.prisma.organizationDetails.create({
        data: {
          consumer: { connect: { id: consumerId } },
          ...body,
        },
      });
    }

    return { organizationDetailsId: organizationDetails.id };
  }

  async completeProfileCreation(consumerId: string, referer: string): Promise<void | never> {
    const consumer = await this.prisma.consumer.findFirst({ where: { id: consumerId } });
    if (!consumer) throw new BadRequestException(`No consumer for provided consumerId: ${consumerId}`);
    const token = await this.jwtService //
      .signAsync({ identityId: consumerId, type: `access` }, { expiresIn: 86400 }); //86400 ~ 24hrs in milliseconds
    this.mailingService.sendConsumerSignupCompletionEmail({ email: consumer.email, token, referer });
  }
}
