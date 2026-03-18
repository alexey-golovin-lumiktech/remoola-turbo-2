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

@Injectable()
export class BrevoMailService {
  private readonly logger = new Logger(BrevoMailService.name);
  private readonly baseUrl = envs.BREVO_API_BASE_URL.replace(/\/+$/, ``);

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

  async sendMail(options: BrevoSendMailOptions): Promise<void> {
    const payload = this.buildPayload(options);
    const host = new URL(this.baseUrl).host;
    this.logger.verbose(`Brevo send attempt host=${host}`);
    const response = await fetch(`${this.baseUrl}/smtp/email`, {
      method: `POST`,
      headers: {
        accept: `application/json`,
        'content-type': `application/json`,
        'api-key': envs.BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw this.buildHttpErrorMessage(`Brevo send failed`, { status: response.status });
    }
  }

  async verify(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error(`Brevo mail transport is not configured`);
    }

    const host = new URL(this.baseUrl).host;
    this.logger.verbose(`Brevo verify attempt host=${host}`);
    const response = await fetch(`${this.baseUrl}/account`, {
      method: `GET`,
      headers: {
        accept: `application/json`,
        'api-key': envs.BREVO_API_KEY,
      },
    });

    if (!response.ok) {
      throw this.buildHttpErrorMessage(`Brevo verification failed`, { status: response.status });
    }
  }
}
