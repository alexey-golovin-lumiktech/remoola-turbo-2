import { Injectable } from '@nestjs/common';

import { UpdateThemeDto } from './dto/update-theme.dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getThemeSettings(consumerId: string) {
    const settings = await this.prisma.userSettingsModel.findUnique({
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
    const settings = await this.prisma.userSettingsModel.upsert({
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
}
