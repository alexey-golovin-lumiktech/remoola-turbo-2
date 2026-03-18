import { Injectable, Logger } from '@nestjs/common';

import { isValidEmail } from '@remoola/api-types';

import { envs } from '../envs';

export type BrevoAttachment = {
  filename: string;
  content: Buffer | Uint8Array | string;
};

export type BrevoSendMailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: BrevoAttachment[];
};

type BrevoSendEmailRequest = {
  sender: {
    email: string;
    name?: string;
  };
  to: Array<{ email: string }>;
  subject: string;
  htmlContent: string;
  attachment?: Array<{ name: string; content: string }>;
};

type BrevoHttpErrorContext = { status: number };

/**
 * Request timeout for Brevo API calls.
 * Keeps requests bounded on serverless (Vercel, Lambda).
 * Worst-case total with 3 attempts + delays: (TIMEOUT * 3) + (RETRY_DELAY * 2).
 * At 18s: 18 + 1 + 18 + 1 + 18 = 56s — fits inside a 60s Vercel Pro function limit.
 * Ensure the Vercel function maxDuration for email-sending routes is set to 60s.
 */
const BREVO_REQUEST_TIMEOUT_MS = 18_000;

/** Delay before retry on transient socket/network errors. */
const BREVO_RETRY_DELAY_MS = 1_000;

function isTransientSocketError(error: unknown): boolean {
  // AbortSignal.timeout() throws a DOMException with name "TimeoutError"
  if (error instanceof DOMException && error.name === `TimeoutError`) return true;
  if (error instanceof Error && error.name === `TimeoutError`) return true;

  if (error instanceof Error && error.cause != null && typeof error.cause === `object`) {
    const code = (error.cause as Record<string, unknown>).code;
    if (typeof code === `string`) {
      return (
        code === `UND_ERR_SOCKET` ||
        code === `ECONNRESET` ||
        code === `ETIMEDOUT` ||
        code === `ECONNREFUSED` ||
        code === `ENOTFOUND` ||
        code === `EAI_AGAIN`
      );
    }
  }
  return false;
}

@Injectable()
export class BrevoMailService {
  private readonly logger = new Logger(BrevoMailService.name);
  private readonly baseUrl = envs.BREVO_API_BASE_URL.replace(/\/+$/, ``);
  private readonly legacyBaseUrl = `https://api.sendinblue.com/v3`;

  private toRecipientList(to: string | string[]): Array<{ email: string }> {
    const recipients = Array.isArray(to) ? to : [to];
    return recipients
      .map((email) => email.trim())
      .filter((email) => isValidEmail(email))
      .map((email) => ({ email }));
  }

  private toBase64(value: Buffer | Uint8Array | string): string {
    if (Buffer.isBuffer(value)) return value.toString(`base64`);
    if (value instanceof Uint8Array) return Buffer.from(value).toString(`base64`);
    return Buffer.from(value, `utf8`).toString(`base64`);
  }

  private buildPayload(options: BrevoSendMailOptions): BrevoSendEmailRequest {
    const sender = {
      email: envs.BREVO_DEFAULT_FROM_EMAIL,
      ...(envs.BREVO_DEFAULT_FROM_NAME.trim().length > 0 ? { name: envs.BREVO_DEFAULT_FROM_NAME } : {}),
    };

    const payload: BrevoSendEmailRequest = {
      sender,
      to: this.toRecipientList(options.to),
      subject: options.subject,
      htmlContent: options.html,
    };

    if (options.attachments && options.attachments.length > 0) {
      payload.attachment = options.attachments.map((attachment) => ({
        name: attachment.filename,
        content: this.toBase64(attachment.content),
      }));
    }

    return payload;
  }

  private isConfigured(): boolean {
    return (
      envs.BREVO_API_KEY.trim().length > 0 &&
      envs.BREVO_API_KEY !== `BREVO_API_KEY` &&
      envs.BREVO_DEFAULT_FROM_EMAIL.trim().length > 0 &&
      envs.BREVO_DEFAULT_FROM_EMAIL !== `BREVO_DEFAULT_FROM_EMAIL`
    );
  }

  /** Error message omits response body to avoid logging sensitive Brevo payloads (governance §7/§8). */
  private buildHttpErrorMessage(prefix: string, context: BrevoHttpErrorContext): Error {
    return new Error(`${prefix} (${context.status})`);
  }

  private async sendMailOnce(options: BrevoSendMailOptions, attempt: number, baseUrl: string): Promise<void> {
    const payload = this.buildPayload(options);
    if (payload.to.length === 0) {
      throw new Error(`Brevo send aborted: no valid recipients after filtering (to=${JSON.stringify(options.to)})`);
    }
    const host = new URL(baseUrl).host;
    this.logger.verbose(`Brevo send attempt host=${host} attempt=${attempt}`);
    const response = await fetch(`${baseUrl}/smtp/email`, {
      method: `POST`,
      headers: {
        accept: `application/json`,
        'content-type': `application/json`,
        'api-key': envs.BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(BREVO_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw this.buildHttpErrorMessage(`Brevo send failed`, { status: response.status });
    }
  }

  async sendMail(options: BrevoSendMailOptions): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(`Brevo is not configured — skipping email send (to=${JSON.stringify(options.to)})`);
      return;
    }
    try {
      await this.sendMailOnce(options, 1, this.baseUrl);
    } catch (error) {
      if (isTransientSocketError(error) && error instanceof Error) {
        this.logger.warn(
          `Brevo send failed with transient socket/network error, retrying once after ${BREVO_RETRY_DELAY_MS}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, BREVO_RETRY_DELAY_MS));
        try {
          await this.sendMailOnce(options, 2, this.baseUrl);
          return;
        } catch (retryError) {
          if (isTransientSocketError(retryError) && retryError instanceof Error) {
            const configuredHost = new URL(this.baseUrl).host;
            const legacyHost = new URL(this.legacyBaseUrl).host;
            if (configuredHost !== legacyHost) {
              this.logger.warn(
                `Brevo send failed again with transient socket/network error; attempting legacy Brevo host fallback`,
              );
              await this.sendMailOnce(options, 3, this.legacyBaseUrl);
              return;
            }
          }
          throw retryError;
        }
      }
      throw error;
    }
  }

  async verify(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error(`Brevo mail transport is not configured`);
    }

    try {
      const host = new URL(this.baseUrl).host;
      this.logger.verbose(`Brevo verify attempt host=${host}`);
      const response = await fetch(`${this.baseUrl}/account`, {
        method: `GET`,
        headers: {
          accept: `application/json`,
          'api-key': envs.BREVO_API_KEY,
        },
        signal: AbortSignal.timeout(BREVO_REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw this.buildHttpErrorMessage(`Brevo verification failed`, { status: response.status });
      }
    } catch (error) {
      const configuredHost = new URL(this.baseUrl).host;
      const legacyHost = new URL(this.legacyBaseUrl).host;
      if (!(error instanceof Error) || !isTransientSocketError(error) || configuredHost === legacyHost) {
        throw error;
      }

      this.logger.warn(`Brevo verify transient socket/network error; trying legacy Brevo host fallback`);
      const response = await fetch(`${this.legacyBaseUrl}/account`, {
        method: `GET`,
        headers: {
          accept: `application/json`,
          'api-key': envs.BREVO_API_KEY,
        },
        signal: AbortSignal.timeout(BREVO_REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw this.buildHttpErrorMessage(`Brevo verification failed`, { status: response.status });
      }
    }
  }
}
