import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import puppeteer from 'puppeteer-core';

import { $Enums } from '@remoola/database-2';

import { buildInvoiceHtmlV5 } from './templates';
import { PrismaService } from '../../../shared/prisma.service';
import { getBrowser, pfdPageViewport } from '../../../shared-common/pdf-generator-package/constants';
import { FileStorageService } from '../files/file-storage.service';

@Injectable()
export class ConsumerInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorageService,
  ) {}

  async generateInvoice(paymentRequestId: string, consumerId: string, backendHost) {
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

    if (!payment) throw new NotFoundException(`Payment request not found`);

    // only payer or requester can generate invoice
    if (payment.payerId !== consumerId && payment.requesterId !== consumerId) {
      throw new ForbiddenException(`You are not allowed to access this invoice`);
    }

    const invoiceNumber = `INV-${payment.status}-${payment.id.slice(0, 8)}-${Date.now()}`;

    // 1) Build HTML
    const html = buildInvoiceHtmlV5({ invoiceNumber, payment });

    // 2) Render PDF buffer via Puppeteer
    const buffer = await this.renderPdfFromHtml(html);

    // 3) Upload to S3 and create ResourceModel
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

    // 4) Link to consumer
    await this.prisma.consumerResourceModel.create({
      data: {
        consumerId,
        resourceId: resource.id,
      },
    });

    // 5) Attach to payment request
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
