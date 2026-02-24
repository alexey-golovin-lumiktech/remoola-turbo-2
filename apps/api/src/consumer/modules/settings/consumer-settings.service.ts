import { BadRequestException, Injectable } from '@nestjs/common';

import { CURRENCY_CODES, TCurrencyCode, toCurrencyOrNull, toCurrencyOrUndefined } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { UpdatePreferredCurrency } from './dto/update-preferred-currency.dto';
import { UpdateTheme } from './dto/update-theme.dto';
import { PrismaService } from '../../../shared/prisma.service';

import type { PatchConsumerSettings } from './dto/patch-consumer-settings.dto';

/** Map api-types allowlist to Prisma enum for DB writes. Fintech-safe: server enforces allowlist. */
const ALLOWED_SET: Set<string> = new Set(CURRENCY_CODES);

@Injectable()
export class ConsumerSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(consumerId: string) {
    const settings = await this.prisma.consumerSettingsModel.findUnique({
      where: {
        consumerId,
        deletedAt: null,
      },
    });

    return {
      theme: settings?.theme ?? null,
      preferredCurrency: toCurrencyOrNull(settings?.preferredCurrency),
    };
  }

  async getThemeSettings(consumerId: string) {
    const settings = await this.prisma.consumerSettingsModel.findUnique({
      where: {
        consumerId,
        deletedAt: null,
      },
    });
    return {
      theme: settings?.theme ?? null,
    };
  }

  async updateThemeSettings(consumerId: string, updateThemeDto: UpdateTheme) {
    const settings = await this.prisma.consumerSettingsModel.upsert({
      where: {
        consumerId,
        deletedAt: null,
      },
      update: {
        theme: updateThemeDto.theme,
        updatedAt: new Date(),
      },
      create: {
        consumerId,
        theme: updateThemeDto.theme,
      },
    });

    return {
      theme: settings.theme,
    };
  }

  async updatePreferredCurrency(consumerId: string, dto: UpdatePreferredCurrency) {
    const preferredCurrency = toCurrencyOrUndefined(dto.preferredCurrency);
    if (preferredCurrency === undefined) {
      throw new BadRequestException(`Unsupported preferred currency`);
    }

    const settings = await this.prisma.consumerSettingsModel.upsert({
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

    return {
      preferredCurrency: settings.preferredCurrency,
    };
  }

  /** Partial update; only provided fields are applied. Fintech-safe: preferredCurrency validated against allowlist. */
  async patchSettings(consumerId: string, dto: PatchConsumerSettings) {
    const update: {
      theme?: $Enums.Theme;
      preferredCurrency?: TCurrencyCode;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (dto.theme !== undefined) {
      update.theme = dto.theme as $Enums.Theme;
    }
    if (dto.preferredCurrency !== undefined) {
      const preferredCurrency = toCurrencyOrUndefined(dto.preferredCurrency);
      if (preferredCurrency !== undefined) update.preferredCurrency = preferredCurrency;
    }

    const settings = await this.prisma.consumerSettingsModel.upsert({
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

    const preferredCurrency = settings.preferredCurrency ?? null;
    return {
      theme: settings.theme,
      preferredCurrency: preferredCurrency && ALLOWED_SET.has(preferredCurrency) ? preferredCurrency : null,
    };
  }
}
