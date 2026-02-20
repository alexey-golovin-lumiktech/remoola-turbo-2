import { Controller, Get, Patch, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerSettingsService } from './consumer-settings.service';
import { PatchConsumerSettingsDto } from './dto/patch-consumer-settings.dto';
import { UpdatePreferredCurrencyDto } from './dto/update-preferred-currency.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@ApiTags(`Consumer Settings`)
@Controller(`consumer/settings`)
@UseGuards(JwtAuthGuard)
export class ConsumerSettingsController {
  constructor(private readonly settingsService: ConsumerSettingsService) {}

  @Get()
  @ApiOperation({ summary: `Get consumer settings (theme + preferred currency)` })
  @ApiResponse({ status: 200, description: `Settings retrieved successfully` })
  async getSettings(@Identity() consumer: ConsumerModel) {
    return this.settingsService.getSettings(consumer.id);
  }

  @Patch()
  @ApiOperation({ summary: `Partially update consumer settings (theme and/or preferred currency)` })
  @ApiResponse({ status: 200, description: `Settings updated successfully` })
  async patchSettings(@Identity() consumer: ConsumerModel, @Body() dto: PatchConsumerSettingsDto) {
    return this.settingsService.patchSettings(consumer.id, dto);
  }

  @Get(`theme`)
  @ApiOperation({ summary: `Get user theme settings` })
  @ApiResponse({ status: 200, description: `Theme settings retrieved successfully` })
  async getThemeSettings(@Identity() consumer: ConsumerModel) {
    return this.settingsService.getThemeSettings(consumer.id);
  }

  @Put(`theme`)
  @ApiOperation({ summary: `Update user theme settings` })
  @ApiResponse({ status: 200, description: `Theme settings updated successfully` })
  async updateThemeSettings(@Identity() consumer: ConsumerModel, @Body() updateThemeDto: UpdateThemeDto) {
    return this.settingsService.updateThemeSettings(consumer.id, updateThemeDto);
  }

  @Put(`preferred-currency`)
  @ApiOperation({ summary: `Update preferred display currency (UI default only)` })
  @ApiResponse({ status: 200, description: `Preferred currency updated successfully` })
  async updatePreferredCurrency(@Identity() consumer: ConsumerModel, @Body() dto: UpdatePreferredCurrencyDto) {
    return this.settingsService.updatePreferredCurrency(consumer.id, dto);
  }
}
