import { Injectable } from '@nestjs/common';

import { PrismaService } from '../shared/prisma.service';

@Injectable()
export class HealthService {
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
      console.error(`Health check database error:`, error);
      return {
        status: `error`,
        timestamp: new Date().toISOString(),
        services: {
          database: `error`,
        },
        error: error.message,
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
      environment: process.env.NODE_ENV || `development`,
    };
  }
}
