import { Injectable } from '@nestjs/common';

import { ALLOWED_PREFERRED_CURRENCIES } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { UpdatePreferredCurrencyDto } from './dto/update-preferred-currency.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { PrismaService } from '../../../shared/prisma.service';

import type { PatchConsumerSettingsDto } from './dto/patch-consumer-settings.dto';

/** Map api-types allowlist to Prisma enum for DB writes. Fintech-safe: server enforces allowlist. */
const ALLOWED_SET: Set<string> = new Set(ALLOWED_PREFERRED_CURRENCIES);
const TO_ENUM: Record<string, $Enums.CurrencyCode> = {
  USD: $Enums.CurrencyCode.USD,
  EUR: $Enums.CurrencyCode.EUR,
  GBP: $Enums.CurrencyCode.GBP,
  JPY: $Enums.CurrencyCode.JPY,
  AUD: $Enums.CurrencyCode.AUD,
};

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

    const preferredCurrency = settings?.preferredCurrency ?? null;
    const preferredCurrencySafe = preferredCurrency && ALLOWED_SET.has(preferredCurrency) ? preferredCurrency : null;

    return {
      theme: settings?.theme ?? null,
      preferredCurrency: preferredCurrencySafe,
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

  async updateThemeSettings(consumerId: string, updateThemeDto: UpdateThemeDto) {
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

  async updatePreferredCurrency(consumerId: string, dto: UpdatePreferredCurrencyDto) {
    const enumValue = TO_ENUM[dto.preferredCurrency];
    if (!enumValue || !ALLOWED_SET.has(dto.preferredCurrency)) {
      throw new Error(`Unsupported preferred currency`);
    }

    const settings = await this.prisma.consumerSettingsModel.upsert({
      where: {
        consumerId,
        deletedAt: null,
      },
      update: {
        preferredCurrency: enumValue,
        updatedAt: new Date(),
      },
      create: {
        consumerId,
        preferredCurrency: enumValue,
      },
    });

    return {
      preferredCurrency: settings.preferredCurrency,
    };
  }

  /** Partial update; only provided fields are applied. Fintech-safe: preferredCurrency validated against allowlist. */
  async patchSettings(consumerId: string, dto: PatchConsumerSettingsDto) {
    const update: {
      theme?: $Enums.Theme;
      preferredCurrency?: $Enums.CurrencyCode | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (dto.theme !== undefined) {
      update.theme = dto.theme as $Enums.Theme;
    }
    if (dto.preferredCurrency !== undefined) {
      if (!ALLOWED_SET.has(dto.preferredCurrency)) {
        throw new Error(`Unsupported preferred currency`);
      }
      update.preferredCurrency = TO_ENUM[dto.preferredCurrency];
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
