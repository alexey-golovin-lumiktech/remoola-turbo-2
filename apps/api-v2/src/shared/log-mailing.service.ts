import { Injectable } from '@nestjs/common';

import { envs } from '../envs';
import { MailTransportSenderService } from './mail-transport-sender.service';

@Injectable()
export class LogMailingService {
  constructor(private readonly mailTransportSender: MailTransportSenderService) {}

  async sendLogsEmail(data: unknown = null, email?: string): Promise<void> {
    const html = `<pre><code>${JSON.stringify(data ?? {}, null, 2)}</code></pre>`;
    const subject = `WB Logs`;
    await this.mailTransportSender.sendEmailWithErrorHandling(`sendLogsEmail`, {
      to: email ?? envs.DEFAULT_ADMIN_EMAIL!,
      subject,
      html,
    });
  }
}
