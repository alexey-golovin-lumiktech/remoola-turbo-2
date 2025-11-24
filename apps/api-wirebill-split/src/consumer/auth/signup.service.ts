import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type AddressDetailsModel, type OrganizationDetailsModel, type PersonalDetailsModel } from '@remoola/database';

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
    const exist = await this.prisma.consumerModel.findFirst({ where: { email: body.email } });
    if (exist) {
      if (envs.NODE_ENV === `production`) {
        throw new BadRequestException(`Email: "${body.email}" is already registered`);
      }

      return { consumerId: exist.id };
    }

    const { salt, hash } = await passwordUtils.hashPassword(body.password);
    const consumer = await this.prisma.consumerModel.create({
      data: {
        salt: salt,
        email: body.email,
        password: hash,
        accountType: body.accountType,
        howDidHearAboutUs: body.howDidHearAboutUs,
        howDidHearAboutUsOther: body.howDidHearAboutUsOther,
        contractorKind: body.contractorKind,
      },
    });
    return { consumerId: consumer.id };
  }

  async personalDetails(consumerId: string, body: PersonalDetailsUpsert) {
    const exist = await this.prisma.personalDetailsModel.findFirst({ where: { consumerId } });

    let personalDetails: PersonalDetailsModel;
    const data = {
      citizenOf: body.citizenOf || null,
      dateOfBirth: body.dateOfBirth,
      passportOrIdNumber: body.passportOrIdNumber || null,
      countryOfTaxResidence: body.countryOfTaxResidence || null,
      taxId: body.taxId || null,
      phoneNumber: body.phoneNumber || null,
    };

    if (exist) {
      personalDetails = await this.prisma.personalDetailsModel.update({
        where: { id: exist.id },
        data,
      });
    } else {
      personalDetails = await this.prisma.personalDetailsModel.create({
        data: {
          consumer: { connect: { id: consumerId } },
          ...data,
        },
      });
    }

    return { personalDetailsId: personalDetails.id };
  }

  async addressDetails(consumerId: string, body: AddressDetailsUpsert) {
    const exist = await this.prisma.addressDetailsModel.findFirst({ where: { consumerId } });

    let addressDetails: AddressDetailsModel;
    if (exist) {
      addressDetails = await this.prisma.addressDetailsModel.update({
        where: { id: exist.id },
        data: body,
      });
    } else {
      addressDetails = await this.prisma.addressDetailsModel.create({
        data: {
          consumer: { connect: { id: consumerId } },
          ...body,
        },
      });
    }

    return { addressDetailsId: addressDetails.id };
  }

  async organizationDetails(consumerId: string, body: OrganizationDetailsUpsert) {
    const exist = await this.prisma.organizationDetailsModel.findFirst({ where: { consumerId } });

    let organizationDetails: OrganizationDetailsModel;
    if (exist) {
      organizationDetails = await this.prisma.organizationDetailsModel.update({
        where: { id: exist.id },
        data: body,
      });
    } else {
      organizationDetails = await this.prisma.organizationDetailsModel.create({
        data: {
          consumer: { connect: { id: consumerId } },
          ...body,
        },
      });
    }

    return { organizationDetailsId: organizationDetails.id };
  }

  async completeProfileCreationAndSendVerificationEmail(consumerId: string, referer: string): Promise<void | never> {
    const consumer = await this.prisma.consumerModel.findFirst({ where: { id: consumerId } });
    if (!consumer) throw new BadRequestException(`No consumer for provided consumerId: ${consumerId}`);
    const token = await this.jwtService //
      .signAsync({ identityId: consumerId, type: `access` }, { expiresIn: 86400 }); //86400 ~ 24hrs in milliseconds
    this.mailingService.sendConsumerSignupVerificationEmail({ email: consumer.email, token, referer });
  }
}
