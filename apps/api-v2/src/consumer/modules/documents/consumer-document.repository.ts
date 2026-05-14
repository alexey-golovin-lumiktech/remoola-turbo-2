import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { buildConsumerDocumentPaymentParticipantWhere } from './consumer-document-query-helpers';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findConsumerEmailById(consumerId: string) {
    return this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });
  }

  findOwnedDraftPaymentRequest(consumerId: string, paymentRequestId: string) {
    return this.prisma.paymentRequestModel.findFirst({
      where: {
        id: paymentRequestId.trim(),
        requesterId: consumerId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  async createUploadedResource(params: {
    consumerId: string;
    originalName: string;
    mimetype: string;
    size: number;
    bucket: string;
    key: string;
    downloadUrl: string;
    paymentRequestId?: string;
  }) {
    const resource = await this.prisma.resourceModel.create({
      data: {
        access: $Enums.ResourceAccess.PRIVATE,
        originalName: params.originalName,
        mimetype: params.mimetype,
        size: params.size,
        bucket: params.bucket,
        key: params.key,
        downloadUrl: params.downloadUrl,
      },
    });

    await this.prisma.consumerResourceModel.create({
      data: {
        consumerId: params.consumerId,
        resourceId: resource.id,
      },
    });

    if (params.paymentRequestId) {
      await this.prisma.paymentRequestAttachmentModel.create({
        data: {
          paymentRequestId: params.paymentRequestId,
          requesterId: params.consumerId,
          resourceId: resource.id,
        },
      });
    }

    return resource;
  }

  findDownloadableResourceForConsumer(consumerId: string, resourceId: string, consumerEmail: string | null) {
    return this.prisma.resourceModel.findFirst({
      where: {
        id: resourceId,
        deletedAt: null,
        OR: [
          {
            consumerResources: {
              some: {
                consumerId,
                deletedAt: null,
              },
            },
          },
          {
            AND: [
              {
                resourceTags: {
                  none: {
                    tag: { name: { startsWith: `INVOICE-` } },
                  },
                },
              },
              {
                attachments: {
                  some: {
                    deletedAt: null,
                    paymentRequest: {
                      deletedAt: null,
                      OR: buildConsumerDocumentPaymentParticipantWhere(consumerId, consumerEmail),
                    },
                  },
                },
              },
            ],
          },
          {
            AND: [
              {
                resourceTags: {
                  some: {
                    tag: { name: { startsWith: `INVOICE-` } },
                  },
                },
              },
              {
                attachments: {
                  some: {
                    deletedAt: null,
                    requesterId: consumerId,
                    paymentRequest: {
                      deletedAt: null,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      select: {
        bucket: true,
        key: true,
        originalName: true,
        mimetype: true,
      },
    });
  }

  findOwnedResourceMappings(consumerId: string, resourceIds: string[]) {
    return this.prisma.consumerResourceModel.findMany({
      where: {
        consumerId,
        resourceId: { in: resourceIds },
      },
      select: { resourceId: true },
    });
  }

  findAttachmentStatuses(resourceIds: string[]) {
    return this.prisma.paymentRequestAttachmentModel.findMany({
      where: {
        resourceId: { in: resourceIds },
      },
      select: {
        resourceId: true,
        paymentRequest: {
          select: {
            status: true,
          },
        },
      },
    });
  }

  deleteOwnedResourceMappings(consumerId: string, resourceIds: string[]) {
    return this.prisma.consumerResourceModel.deleteMany({
      where: {
        consumerId,
        resourceId: { in: resourceIds },
      },
    });
  }

  deleteResourceTags(resourceIds: string[]) {
    return this.prisma.resourceTagModel.deleteMany({
      where: {
        resourceId: { in: resourceIds },
      },
    });
  }

  findAccessibleAttachmentResources(consumerId: string, resourceIds: string[], consumerEmail: string | null) {
    return this.prisma.paymentRequestAttachmentModel.findMany({
      where: {
        deletedAt: null,
        resource: {
          deletedAt: null,
        },
        resourceId: { in: resourceIds },
        paymentRequest: {
          deletedAt: null,
          OR: buildConsumerDocumentPaymentParticipantWhere(consumerId, consumerEmail),
        },
      },
      select: { resourceId: true },
    });
  }

  findOwnedAccessibleResources(consumerId: string, resourceIds: string[]) {
    return this.prisma.consumerResourceModel.findMany({
      where: {
        consumerId,
        resourceId: { in: resourceIds },
        deletedAt: null,
        resource: {
          deletedAt: null,
        },
      },
      select: { resourceId: true },
    });
  }

  findExistingPaymentAttachments(paymentRequestId: string, resourceIds: string[]) {
    return this.prisma.paymentRequestAttachmentModel.findMany({
      where: {
        paymentRequestId,
        resourceId: { in: resourceIds },
        deletedAt: null,
      },
      select: { resourceId: true },
    });
  }

  createPaymentAttachments(paymentRequestId: string, consumerId: string, resourceIds: string[]) {
    return this.prisma.paymentRequestAttachmentModel.createMany({
      data: resourceIds.map((resourceId) => ({
        paymentRequestId,
        requesterId: consumerId,
        resourceId,
      })),
      skipDuplicates: true,
    });
  }

  detachPaymentAttachment(paymentRequestId: string, consumerId: string, resourceId: string) {
    return this.prisma.paymentRequestAttachmentModel.deleteMany({
      where: {
        paymentRequestId,
        requesterId: consumerId,
        resourceId,
      },
    });
  }

  findConsumerResourceAccess(consumerId: string, resourceId: string) {
    return this.prisma.consumerResourceModel.findFirst({
      where: {
        consumerId,
        resourceId,
        deletedAt: null,
        resource: {
          deletedAt: null,
        },
      },
    });
  }

  findAttachmentAccess(consumerId: string, resourceId: string, consumerEmail: string | null) {
    return this.prisma.paymentRequestAttachmentModel.findFirst({
      where: {
        deletedAt: null,
        resource: {
          deletedAt: null,
        },
        resourceId,
        paymentRequest: {
          deletedAt: null,
          OR: buildConsumerDocumentPaymentParticipantWhere(consumerId, consumerEmail),
        },
      },
      select: { resourceId: true },
    });
  }

  upsertDocumentTag(name: string) {
    return this.prisma.documentTagModel.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  async replaceResourceTags(resourceId: string, tagIds: string[]) {
    await this.prisma.resourceTagModel.deleteMany({
      where: { resourceId },
    });

    await this.prisma.resourceTagModel.createMany({
      data: tagIds.map((tagId) => ({
        resourceId,
        tagId,
      })),
    });
  }
}
