import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerSettingsService } from './consumer-settings.service';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@ApiTags(`Consumer Settings`)
@Controller(`consumer/settings`)
@UseGuards(JwtAuthGuard)
export class ConsumerSettingsController {
  constructor(private readonly settingsService: ConsumerSettingsService) {}

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
}
