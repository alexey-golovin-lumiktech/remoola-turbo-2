import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import { ConsumerInvoiceRepository } from './consumer-invoice.repository';
import { buildInvoiceHtmlV5 } from './templates';
import { getBrowser, pfdPageViewport } from '../../../shared-common/pdf-generator-package/constants';
import { normalizeConsumerFacingTransactionStatus } from '../../consumer-status-compat';
import { buildConsumerDocumentDownloadUrl } from '../documents/document-download-url';
import { FileStorageService } from '../files/file-storage.service';

/** Return existing invoice if same consumer generated one for this payment in last 60s (double-click / retry). */
const RECENT_INVOICE_WINDOW_MS = 60_000;

@Injectable()
export class ConsumerInvoiceService {
  constructor(
    private readonly storage: FileStorageService,
    private readonly invoiceRepository: ConsumerInvoiceRepository,
  ) {}

  async generateInvoice(
    paymentRequestId: string,
    consumerId: string,
    backendBaseUrl: string | undefined,
  ): Promise<{ invoiceNumber: string; resourceId: string; downloadUrl: string }> {
    const [consumer, payment] = await Promise.all([
      this.invoiceRepository.findConsumerEmailById(consumerId),
      this.invoiceRepository.findPaymentForInvoice(paymentRequestId),
    ]);

    if (!payment) throw new NotFoundException(errorCodes.PAYMENT_REQUEST_NOT_FOUND_INVOICE);

    const isEmailOnlyPayer =
      !payment.payerId &&
      !!payment.payerEmail &&
      !!consumer?.email &&
      payment.payerEmail.trim().toLowerCase() === consumer.email.trim().toLowerCase();
    const isEmailOnlyRequester =
      !payment.requesterId &&
      !!payment.requesterEmail &&
      !!consumer?.email &&
      payment.requesterEmail.trim().toLowerCase() === consumer.email.trim().toLowerCase();

    if (
      payment.payerId !== consumerId &&
      payment.requesterId !== consumerId &&
      !isEmailOnlyPayer &&
      !isEmailOnlyRequester
    ) {
      throw new ForbiddenException(errorCodes.INVOICE_ACCESS_DENIED);
    }

    const since = new Date(Date.now() - RECENT_INVOICE_WINDOW_MS);
    const existing = await this.invoiceRepository.findRecentInvoiceAttachment(payment.id, consumerId, since);
    if (existing?.resource) {
      const name = existing.resource.originalName.replace(/\.pdf$/i, ``);
      return {
        invoiceNumber: name,
        resourceId: existing.resource.id,
        downloadUrl: buildConsumerDocumentDownloadUrl(existing.resource.id, backendBaseUrl),
      };
    }

    const consumerFacingStatus = normalizeConsumerFacingTransactionStatus(payment.status);
    const invoiceNumber = `INV-${consumerFacingStatus}-${payment.id.slice(0, 8)}-${Date.now()}`;

    try {
      const html = buildInvoiceHtmlV5({ invoiceNumber, payment: { ...payment, status: consumerFacingStatus } });
      const buffer = await this.renderPdfFromHtml(html);

      const originalName = `${invoiceNumber}.pdf`;
      const mimetype = `application/pdf`;
      const { bucket, key, downloadUrl } = await this.storage.upload(
        { buffer, originalName, mimetype, folder: `invoices` },
        backendBaseUrl,
      );

      const resource = await this.invoiceRepository.createInvoiceResourceAndAttachment({
        consumerId,
        paymentRequestId: payment.id,
        invoiceNumber,
        consumerFacingStatus,
        mimetype,
        size: buffer.length,
        bucket,
        key,
        downloadUrl,
      });

      return {
        invoiceNumber,
        resourceId: resource.id,
        downloadUrl: buildConsumerDocumentDownloadUrl(resource.id, backendBaseUrl),
      };
    } catch {
      throw new InternalServerErrorException(errorCodes.INVOICE_GENERATION_FAILED);
    }
  }

  private async renderPdfFromHtml(html: string): Promise<Buffer> {
    const browser = await getBrowser();

    try {
      const page = await browser.newPage();
      await page.setViewport(pfdPageViewport);
      await page.setContent(html, { waitUntil: `networkidle0` });

      await page.emulateMediaType(`screen`);

      const pdfUint8 = await page.pdf({
        format: `A4`,
        printBackground: true,
        margin: {
          top: `10mm`,
          right: `10mm`,
          bottom: `10mm`,
          left: `10mm`,
        },
      });

      return Buffer.from(pdfUint8);
    } finally {
      await browser.close();
    }
  }
}
