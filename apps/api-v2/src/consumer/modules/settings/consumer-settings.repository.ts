import { Injectable } from '@nestjs/common';

import { type TCurrencyCode } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

type SettingsPatch = {
  theme?: $Enums.Theme;
  preferredCurrency?: TCurrencyCode;
  updatedAt: Date;
};

@Injectable()
export class ConsumerSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByConsumerId(consumerId: string) {
    return this.prisma.consumerSettingsModel.findUnique({
      where: {
        consumerId,
        deletedAt: null,
      },
    });
  }

  async upsertTheme(consumerId: string, theme: $Enums.Theme) {
    return this.prisma.consumerSettingsModel.upsert({
      where: {
        consumerId,
        deletedAt: null,
      },
      update: {
        theme,
        updatedAt: new Date(),
      },
      create: {
        consumerId,
        theme,
      },
    });
  }

  async upsertPreferredCurrency(consumerId: string, preferredCurrency: TCurrencyCode) {
    return this.prisma.consumerSettingsModel.upsert({
      where: {
        consumerId,
        deletedAt: null,
      },
      update: {
        preferredCurrency,
        updatedAt: new Date(),
      },
      create: {
        consumerId,
        preferredCurrency,
      },
    });
  }

  async patchSettings(consumerId: string, update: SettingsPatch) {
    return this.prisma.consumerSettingsModel.upsert({
      where: {
        consumerId,
        deletedAt: null,
      },
      update,
      create: {
        consumerId,
        ...(update.theme && { theme: update.theme }),
        ...(update.preferredCurrency !== undefined && { preferredCurrency: update.preferredCurrency }),
      },
    });
  }
}
