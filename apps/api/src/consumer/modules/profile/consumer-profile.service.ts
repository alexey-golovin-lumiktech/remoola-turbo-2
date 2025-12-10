import { Injectable } from '@nestjs/common';

import { UpdateConsumerProfileBody, UpdateConsumerPasswordBody } from './dtos';
import { PrismaService } from '../../../shared/prisma.service';
import { passwordUtils } from '../../../shared-common';

@Injectable()
export class ConsumerProfileService {
  constructor(private readonly prisma: PrismaService) {}

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
    const updates: any = {};

    if (body.personalDetails) {
      const current = await this.prisma.personalDetailsModel.findFirst({ where: { consumerId } });
      const patch = {
        firstName: body.personalDetails.firstName || current.firstName,
        lastName: body.personalDetails.lastName || current.lastName,
        citizenOf: body.personalDetails.citizenOf || current.citizenOf,
        passportOrIdNumber: body.personalDetails.passportOrIdNumber || current.passportOrIdNumber,
        legalStatus: body.personalDetails.legalStatus || current.legalStatus,
        dateOfBirth: body.personalDetails.dateOfBirth || current.dateOfBirth,
        countryOfTaxResidence: body.personalDetails.countryOfTaxResidence || current.countryOfTaxResidence,
        taxId: body.personalDetails.taxId || current.taxId,
        phoneNumber: body.personalDetails.phoneNumber || current.phoneNumber,
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
        postalCode: body.addressDetails.postalCode || current.postalCode,
        country: body.addressDetails.country || current.country,
        city: body.addressDetails.city || current.city,
        street: body.addressDetails.street || current.street,
        state: body.addressDetails.state || current.state,
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
      const patch = {
        name: body.organizationDetails.name || current.name,
        consumerRole: current.consumerRole,
        consumerRoleOther: current.consumerRoleOther,
        size: body.organizationDetails.size || current.size,
      };

      updates.organizationDetails = {
        upsert: {
          create: patch,
          update: patch,
        },
      };
    }

    return this.prisma.consumerModel.update({
      where: { id: consumerId },
      data: updates,
      include: {
        personalDetails: true,
        addressDetails: true,
        organizationDetails: true,
      },
    });
  }

  async changePassword(consumerId: string, body: UpdateConsumerPasswordBody) {
    const { hash, salt } = await passwordUtils.hashPassword(body.password);

    return this.prisma.consumerModel.update({
      where: { id: consumerId },
      data: { password: hash, salt },
    });
  }
}
