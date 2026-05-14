import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findConsumerEmailById(consumerId: string) {
    return this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });
  }

  findPaymentForInvoice(paymentRequestId: string) {
    return this.prisma.paymentRequestModel.findUnique({
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
  }

  findRecentInvoiceAttachment(paymentRequestId: string, consumerId: string, since: Date) {
    return this.prisma.paymentRequestAttachmentModel.findFirst({
      where: {
        paymentRequestId,
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
  }

  async createInvoiceResourceAndAttachment(params: {
    consumerId: string;
    paymentRequestId: string;
    invoiceNumber: string;
    consumerFacingStatus: string;
    mimetype: string;
    size: number;
    bucket: string;
    key: string;
    downloadUrl: string;
  }) {
    const resource = await this.prisma.resourceModel.create({
      data: {
        access: $Enums.ResourceAccess.PRIVATE,
        originalName: `${params.invoiceNumber}.pdf`,
        mimetype: params.mimetype,
        size: params.size,
        bucket: params.bucket,
        key: params.key,
        downloadUrl: params.downloadUrl,
        resourceTags: {
          create: {
            tag: {
              connectOrCreate: {
                where: { name: `INVOICE-${params.consumerFacingStatus}` },
                create: { name: `INVOICE-${params.consumerFacingStatus}` },
              },
            },
          },
        },
      },
    });

    await this.prisma.consumerResourceModel.create({
      data: {
        consumerId: params.consumerId,
        resourceId: resource.id,
      },
    });

    await this.prisma.paymentRequestAttachmentModel.create({
      data: {
        paymentRequestId: params.paymentRequestId,
        requesterId: params.consumerId,
        resourceId: resource.id,
      },
    });

    return resource;
  }
}
