import { Controller, Get, Patch, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import {
  consumerPreferredCurrencySettingsResponseSchema,
  consumerSettingsResponseSchema,
  consumerThemeSettingsResponseSchema,
  type ConsumerPreferredCurrencySettingsResponse,
  type ConsumerSettingsResponse,
  type ConsumerThemeSettingsResponse,
} from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerSettingsService } from './consumer-settings.service';
import { PatchConsumerSettings } from './dto/patch-consumer-settings.dto';
import { UpdatePreferredCurrency } from './dto/update-preferred-currency.dto';
import { UpdateTheme } from './dto/update-theme.dto';
import { Identity } from '../../../common';
import { toConsumerWireContract } from '../../consumer-wire-contract';

@ApiTags(`Consumer Settings`)
@Controller(`consumer/settings`)
export class ConsumerSettingsController {
  constructor(private readonly settingsService: ConsumerSettingsService) {}

  @Get()
  @ApiOperation({ summary: `Get consumer settings (theme + preferred currency)` })
  @ApiResponse({ status: 200, description: `Settings retrieved successfully` })
  async getSettings(@Identity() consumer: ConsumerModel): Promise<ConsumerSettingsResponse> {
    return toConsumerWireContract(consumerSettingsResponseSchema, await this.settingsService.getSettings(consumer.id));
  }

  @Patch()
  @ApiOperation({ summary: `Partially update consumer settings (theme and/or preferred currency)` })
  @ApiResponse({ status: 200, description: `Settings updated successfully` })
  async patchSettings(
    @Identity() consumer: ConsumerModel,
    @Body() dto: PatchConsumerSettings,
  ): Promise<ConsumerSettingsResponse> {
    return toConsumerWireContract(
      consumerSettingsResponseSchema,
      await this.settingsService.patchSettings(consumer.id, dto),
    );
  }

  @Get(`theme`)
  @ApiOperation({ summary: `Get user theme settings` })
  @ApiResponse({ status: 200, description: `Theme settings retrieved successfully` })
  async getThemeSettings(@Identity() consumer: ConsumerModel): Promise<ConsumerThemeSettingsResponse> {
    return toConsumerWireContract(
      consumerThemeSettingsResponseSchema,
      await this.settingsService.getThemeSettings(consumer.id),
    );
  }

  @Put(`theme`)
  @ApiOperation({ summary: `Update user theme settings` })
  @ApiResponse({ status: 200, description: `Theme settings updated successfully` })
  async updateThemeSettings(
    @Identity() consumer: ConsumerModel,
    @Body() updateThemeDto: UpdateTheme,
  ): Promise<ConsumerThemeSettingsResponse> {
    return toConsumerWireContract(
      consumerThemeSettingsResponseSchema,
      await this.settingsService.updateThemeSettings(consumer.id, updateThemeDto),
    );
  }

  @Put(`preferred-currency`)
  @ApiOperation({ summary: `Update preferred display currency (UI default only)` })
  @ApiResponse({ status: 200, description: `Preferred currency updated successfully` })
  async updatePreferredCurrency(
    @Identity() consumer: ConsumerModel,
    @Body() dto: UpdatePreferredCurrency,
  ): Promise<ConsumerPreferredCurrencySettingsResponse> {
    return toConsumerWireContract(
      consumerPreferredCurrencySettingsResponseSchema,
      await this.settingsService.updatePreferredCurrency(consumer.id, dto),
    );
  }
}
