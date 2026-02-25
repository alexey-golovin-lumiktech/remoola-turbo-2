import { Injectable, Logger } from '@nestjs/common';

import { envs } from '../envs';
import { PrismaService } from '../shared/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getHealthStatus() {
    try {
      // Check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: `ok`,
        timestamp: new Date().toISOString(),
        services: {
          database: `ok`,
        },
      };
    } catch (error) {
      this.logger.error(`Health check database error`, error);
      return {
        status: `error`,
        timestamp: new Date().toISOString(),
        services: {
          database: `error`,
        },
        // Do not expose internal error.message to clients (fintech audit)
        error: `Database check failed`,
      };
    }
  }

  async getDetailedHealthStatus() {
    const health = await this.getHealthStatus();

    return {
      ...health,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: envs.NODE_ENV || `development`,
    };
  }
}
