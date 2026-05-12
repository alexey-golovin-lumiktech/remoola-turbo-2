import { Injectable, Logger } from '@nestjs/common';

import { envs } from '../envs';
import { BrevoMailService, type BrevoSendMailOptions } from './brevo-mail.service';

@Injectable()
export class MailTransportSenderService {
  private readonly logger = new Logger(MailTransportSenderService.name);

  constructor(private readonly brevoMailService: BrevoMailService) {}

  private formatUnknownError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  private safeCauseSummary(cause: unknown): Record<string, unknown> | undefined {
    if (cause == null || typeof cause !== `object`) return undefined;
    const obj = cause as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    if (typeof obj.code === `string`) out.code = obj.code;
    if (typeof obj.errno === `number`) out.errno = obj.errno;
    if (typeof obj.syscall === `string`) out.syscall = obj.syscall;
    return Object.keys(out).length > 0 ? out : undefined;
  }

  private logEmailFailure(context: string, error: unknown): void {
    if (error instanceof Error) {
      const causeSummary = this.safeCauseSummary(error.cause);
      const causeSuffix = causeSummary != null ? ` cause: ${JSON.stringify(causeSummary)}` : ``;
      this.logger.error(`[${context}] Email operation failed: ${error.message}${causeSuffix}`, error.stack);
      if (causeSummary?.code === `UND_ERR_SOCKET` || causeSummary?.code === `ECONNRESET`) {
        this.logger.warn(
          `[${context}] Socket/network error: check outbound connectivity
          (e.g. Lambda VPC NAT, Vercel) and Brevo API reachability.`,
        );
      }
      return;
    }

    this.logger.error(`[${context}] Email operation failed with non-Error value: ${this.formatUnknownError(error)}`);
  }

  private isEmailTransportConfigured(): boolean {
    return (
      envs.BREVO_API_KEY.trim().length > 0 &&
      envs.BREVO_API_KEY !== `BREVO_API_KEY` &&
      envs.BREVO_DEFAULT_FROM_EMAIL.trim().length > 0 &&
      envs.BREVO_DEFAULT_FROM_EMAIL !== `BREVO_DEFAULT_FROM_EMAIL`
    );
  }

  async trySendEmail(context: string, options: BrevoSendMailOptions): Promise<boolean> {
    if (!this.isEmailTransportConfigured()) {
      this.logger.warn(`[${context}] Email transport is not configured - skipping email send`);
      return false;
    }

    try {
      await this.brevoMailService.sendMail(options);
      this.logger.verbose(`[${context}] Email sent successfully`);
      return true;
    } catch (error) {
      this.logEmailFailure(context, error);
      return false;
    }
  }

  async sendEmailWithErrorHandling(context: string, options: BrevoSendMailOptions): Promise<void> {
    await this.trySendEmail(context, options);
  }

  async sendEmailOrThrow(context: string, options: BrevoSendMailOptions): Promise<void> {
    const sent = await this.trySendEmail(context, options);
    if (!sent) {
      throw new Error(`[${context}] Email delivery failed`);
    }
  }
}
