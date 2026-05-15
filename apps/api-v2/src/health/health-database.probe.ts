import { Injectable } from '@nestjs/common';

import { PrismaService } from '../shared/prisma.service';

@Injectable()
export class HealthDatabaseProbe {
  constructor(private readonly prisma: PrismaService) {}

  async ping(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
