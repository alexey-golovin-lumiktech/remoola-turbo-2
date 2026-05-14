import { BadRequestException, Injectable } from '@nestjs/common';

import { CURRENCY_CODES, type TCurrencyCode, toCurrencyOrNull, toCurrencyOrUndefined } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { ConsumerSettingsRepository } from './consumer-settings.repository';
import { type PatchConsumerSettings } from './dto/patch-consumer-settings.dto';
import { UpdatePreferredCurrency } from './dto/update-preferred-currency.dto';
import { UpdateTheme } from './dto/update-theme.dto';

@Injectable()
export class ConsumerSettingsService {
  constructor(private readonly settingsRepository: ConsumerSettingsRepository) {}

  async getSettings(consumerId: string) {
    const settings = await this.settingsRepository.findActiveByConsumerId(consumerId);

    return {
      theme: settings?.theme ?? null,
      preferredCurrency: toCurrencyOrNull(settings?.preferredCurrency),
    };
  }

  async getThemeSettings(consumerId: string) {
    const settings = await this.settingsRepository.findActiveByConsumerId(consumerId);
    return {
      theme: settings?.theme ?? null,
    };
  }

  async updateThemeSettings(consumerId: string, updateThemeDto: UpdateTheme) {
    const settings = await this.settingsRepository.upsertTheme(consumerId, updateThemeDto.theme);

    return {
      theme: settings.theme,
    };
  }

  async updatePreferredCurrency(consumerId: string, dto: UpdatePreferredCurrency) {
    const preferredCurrency = toCurrencyOrUndefined(dto.preferredCurrency);
    if (preferredCurrency === undefined) {
      throw new BadRequestException(`Unsupported preferred currency`);
    }

    const settings = await this.settingsRepository.upsertPreferredCurrency(consumerId, preferredCurrency);

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

    const settings = await this.settingsRepository.patchSettings(consumerId, update);

    const preferredCurrency = settings.preferredCurrency ?? null;
    return {
      theme: settings.theme,
      preferredCurrency: preferredCurrency && CURRENCY_CODES.includes(preferredCurrency) ? preferredCurrency : null,
    };
  }
}
