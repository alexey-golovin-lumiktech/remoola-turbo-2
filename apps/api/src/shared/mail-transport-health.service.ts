import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

import { envs } from '../envs';

@Injectable()
export class MailTransportHealthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MailTransportHealthService.name);

  constructor(private readonly mailerService: MailerService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!envs.SMTP_VERIFY_ON_BOOT) {
      this.logger.debug(`SMTP verify on boot is disabled by configuration`);
      return;
    }

    if (envs.VERCEL === 1) {
      this.logger.debug(`SMTP verify on boot is skipped on Vercel`);
      return;
    }

    await this.verify();
  }

  /** Intentional: MailerService does not expose transporter in its public API; used for verify() only. */
  private async verify(): Promise<void> {
    const transporter = this.mailerService[`transporter`] as
      | {
          verify?: () => Promise<unknown>;
          options?: { host?: unknown };
        }
      | undefined;

    if (!transporter?.verify) {
      this.logger.warn(`Mailer transporter.verify() is unavailable`);
      return;
    }

    try {
      const verified = await transporter.verify();
      const smtp =
        typeof transporter.options?.host === `string` && transporter.options.host.trim().length > 0
          ? transporter.options.host
          : undefined;
      let prefix = `SMTP`;
      if (smtp) prefix += `[${smtp}]`;
      if (verified === false) {
        this.logger.warn(`${prefix} verification returned false`);
        return;
      }
      this.logger.debug(`${prefix} verified successfully`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`SMTP verification failed: ${error.message}`, error.stack);
        if (envs.NODE_ENV === `production`) throw error;
        return;
      }

      this.logger.error(`SMTP verification failed with non-Error value: ${String(error)}`);
      if (envs.NODE_ENV === `production` || envs.VERCEL === 1) throw new Error(`SMTP verification failed`);
    }
  }
}
