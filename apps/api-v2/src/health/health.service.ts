import { ForbiddenException, Injectable, Logger } from '@nestjs/common';

import { envs } from '../envs';
import { BrevoMailService } from '../shared/brevo-mail.service';
import { PrismaService } from '../shared/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brevoMailService: BrevoMailService,
  ) {}

  private assertPublicEndpointEnabled(enabled: boolean, endpointName: string): void {
    if (!enabled) {
      throw new ForbiddenException(`${endpointName} is disabled for this environment.`);
    }
  }

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
    this.assertPublicEndpointEnabled(envs.PUBLIC_DETAILED_HEALTH_ENABLED, `Detailed health`);
    const health = await this.getHealthStatus();

    return {
      ...health,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: envs.NODE_ENV || `development`,
    };
  }

  async getMailTransportStatus() {
    this.assertPublicEndpointEnabled(envs.PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED, `Mail transport health`);
    try {
      await this.brevoMailService.verify();
      return {
        status: `ok`,
        timestamp: new Date().toISOString(),
        transport: `brevo`,
      };
    } catch (error) {
      if (error instanceof Error && error.message === `Brevo mail transport is not configured`) {
        return {
          status: `skipped`,
          timestamp: new Date().toISOString(),
          transport: `brevo`,
          reason: `not_configured`,
        };
      }

      if (error instanceof Error) {
        this.logger.error(`Mail transport health check failed: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Mail transport health check failed with non-Error value: ${String(error)}`);
      }

      return {
        status: `error`,
        timestamp: new Date().toISOString(),
        transport: `brevo`,
        error: `Mail transport check failed`,
      };
    }
  }

  async sendTestEmail(to?: string) {
    this.assertPublicEndpointEnabled(envs.HEALTH_TEST_EMAIL_ENABLED, `Health test email`);
    const recipient = to?.trim() || envs.DEFAULT_ADMIN_EMAIL;
    if (!recipient) {
      throw new ForbiddenException(`No recipient configured. Set DEFAULT_ADMIN_EMAIL or pass to in body.`);
    }

    try {
      await this.brevoMailService.sendMail({
        to: recipient,
        subject: `Wirebill test email`,
        html: `<p>Test email sent at ${new Date().toISOString()}</p>`,
      });
      return { status: `sent`, to: recipient };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Test email failed: ${error.message}`, error.stack);
      }
      return { status: `error`, error: `Mail send failed` };
    }
  }
}
