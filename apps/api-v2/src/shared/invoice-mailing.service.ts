import { Injectable, Logger } from '@nestjs/common';

import { generatePdf } from '../shared-common';
import { type BrevoAttachment } from './brevo-mail.service';
import { MailTransportSenderService } from './mail-transport-sender.service';
import {
  invoiceToHtml,
  outgoingInvoiceToHtml,
  payToContactPaymentInfo,
  type InvoiceForTemplate,
} from './mailing-utils';

export type PayToContactPaymentInfoEmailParams = {
  contactEmail: string;
  payerEmail: string;
  paymentDetailsLink: string;
};

@Injectable()
export class InvoiceMailingService {
  private readonly logger = new Logger(InvoiceMailingService.name);

  constructor(private readonly mailTransportSender: MailTransportSenderService) {}

  async sendOutgoingInvoiceEmail(invoice: InvoiceForTemplate) {
    const html = outgoingInvoiceToHtml.processor(invoice);
    const subject = `NEW INVOICE #${invoice.id}`;
    let attachments: BrevoAttachment[];

    try {
      const content = await generatePdf({ rawHtml: invoiceToHtml.processor(invoice) });
      attachments = [{ content, filename: `invoice-${invoice.id}.pdf` }];
    } catch (error) {
      this.logger.error(
        `[sendOutgoingInvoiceEmail.generatePdf] PDF generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      return;
    }

    await this.mailTransportSender.sendEmailWithErrorHandling(`sendOutgoingInvoiceEmail`, {
      to: invoice.referer,
      subject,
      html,
      attachments,
    });
  }

  async sendPayToContactPaymentInfoEmail(params: PayToContactPaymentInfoEmailParams) {
    const html = payToContactPaymentInfo.processor(params);
    const subject = `Wirebill. Payment`;
    await this.mailTransportSender.sendEmailWithErrorHandling(`sendPayToContactPaymentInfoEmail`, {
      to: params.contactEmail,
      subject,
      html,
    });
  }
}
