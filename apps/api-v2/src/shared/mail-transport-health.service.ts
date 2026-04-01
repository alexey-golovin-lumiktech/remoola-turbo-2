import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { envs } from '../envs';
import { BrevoMailService } from './brevo-mail.service';

@Injectable()
export class MailTransportHealthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MailTransportHealthService.name);

  constructor(private readonly brevoMailService: BrevoMailService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!envs.BREVO_VERIFY_ON_BOOT) {
      this.logger.debug(`Brevo verify on boot is disabled by configuration`);
      return;
    }

    if (envs.VERCEL === 1) {
      this.logger.debug(`Brevo verify on boot is skipped on Vercel`);
      return;
    }

    await this.verify();
  }

  private async verify(): Promise<void> {
    try {
      await this.brevoMailService.verify();
      this.logger.debug(`Brevo transport verified successfully`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Brevo verification failed: ${error.message}`, error.stack);
        if (envs.NODE_ENV === `production`) throw error;
        return;
      }

      this.logger.error(`Brevo verification failed with non-Error value: ${String(error)}`);
      if (envs.NODE_ENV === `production`) throw new Error(`Brevo verification failed`);
    }
  }
}
