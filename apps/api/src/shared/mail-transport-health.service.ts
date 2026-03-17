import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

import { envs } from '../envs';

@Injectable()
export class MailTransportHealthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MailTransportHealthService.name);

  constructor(private readonly mailerService: MailerService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!envs.SMTP_VERIFY_ON_BOOT) {
      this.logger.debug(`SMTP verify on boot is disabled`);
      return;
    }

    return this.verify();
  }

  /** Intentional: MailerService does not expose transporter in its public API; used for verify() only. */
  private async verify(): Promise<void> {
    const transporter = this.mailerService[`transporter`];

    if (!transporter?.verify) {
      this.logger.warn(`Mailer transporter.verify() is unavailable`);
      return;
    }

    try {
      await transporter.verify();
      this.logger.debug(`SMTP transporter verified successfully`);
    } catch {
      this.logger.error(`SMTP verification failed`);
      if (envs.NODE_ENV === `production`) throw new Error(`SMTP verification failed`);
    }
  }
}
