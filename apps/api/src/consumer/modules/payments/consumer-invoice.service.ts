import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { buildInvoiceHtmlV5 } from './templates';
import { PrismaService } from '../../../shared/prisma.service';
import { getBrowser, pfdPageViewport } from '../../../shared-common/pdf-generator-package/constants';
import { FileStorageService } from '../files/file-storage.service';

/** Return existing invoice if same consumer generated one for this payment in last 60s (double-click / retry). */
const RECENT_INVOICE_WINDOW_MS = 60_000;

@Injectable()
export class ConsumerInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorageService,
  ) {}

  async generateInvoice(
    paymentRequestId: string,
    consumerId: string,
    backendHost: string | undefined,
  ): Promise<{ invoiceNumber: string; resourceId: string; downloadUrl: string }> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });
    const payment = await this.prisma.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      include: {
        payer: {
          include: { personalDetails: true, addressDetails: true },
        },
        requester: {
          include: { personalDetails: true },
        },
        ledgerEntries: true,
      },
    });

    if (!payment) throw new NotFoundException(errorCodes.PAYMENT_REQUEST_NOT_FOUND_INVOICE);

    const isEmailOnlyPayer =
      !payment.payerId &&
      !!payment.payerEmail &&
      !!consumer?.email &&
      payment.payerEmail.trim().toLowerCase() === consumer.email.trim().toLowerCase();

    if (payment.payerId !== consumerId && payment.requesterId !== consumerId && !isEmailOnlyPayer) {
      throw new ForbiddenException(errorCodes.INVOICE_ACCESS_DENIED);
    }

    const since = new Date(Date.now() - RECENT_INVOICE_WINDOW_MS);
    const existing = await this.prisma.paymentRequestAttachmentModel.findFirst({
      where: {
        paymentRequestId: payment.id,
        requesterId: consumerId,
        deletedAt: null,
        createdAt: { gte: since },
        resource: {
          resourceTags: {
            some: { tag: { name: { startsWith: `INVOICE-` } } },
          },
        },
      },
      orderBy: { createdAt: `desc` },
      include: { resource: true },
    });
    if (existing?.resource) {
      const name = existing.resource.originalName.replace(/\.pdf$/i, ``);
      return {
        invoiceNumber: name,
        resourceId: existing.resource.id,
        downloadUrl: existing.resource.downloadUrl,
      };
    }

    const invoiceNumber = `INV-${payment.status}-${payment.id.slice(0, 8)}-${Date.now()}`;

    try {
      const html = buildInvoiceHtmlV5({ invoiceNumber, payment });
      const buffer = await this.renderPdfFromHtml(html);

      const originalName = `${invoiceNumber}.pdf`;
      const mimetype = `application/pdf`;
      const { bucket, key, downloadUrl } = await this.storage.upload(
        { buffer, originalName, mimetype, folder: `invoices` },
        backendHost,
      );

      const resource = await this.prisma.resourceModel.create({
        data: {
          access: $Enums.ResourceAccess.PRIVATE,
          originalName: originalName,
          mimetype: mimetype,
          size: buffer.length,
          bucket,
          key,
          downloadUrl: downloadUrl,
          resourceTags: {
            create: {
              tag: {
                connectOrCreate: {
                  where: { name: `INVOICE-${payment.status}` },
                  create: { name: `INVOICE-${payment.status}` },
                },
              },
            },
          },
        },
      });

      await this.prisma.consumerResourceModel.create({
        data: {
          consumerId,
          resourceId: resource.id,
        },
      });

      await this.prisma.paymentRequestAttachmentModel.create({
        data: {
          paymentRequestId: payment.id,
          requesterId: consumerId,
          resourceId: resource.id,
        },
      });

      return {
        invoiceNumber,
        resourceId: resource.id,
        downloadUrl: resource.downloadUrl,
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
