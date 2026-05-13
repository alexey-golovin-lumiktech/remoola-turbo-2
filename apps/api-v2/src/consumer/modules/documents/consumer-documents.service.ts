import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerDocumentAccessPolicy } from './consumer-document-access-policy';
import { ConsumerDocumentListQuery } from './consumer-document-list.query';
import { type DocumentListItem } from './consumer-document-mapper';
import { buildConsumerDocumentPaymentParticipantWhere } from './consumer-document-query-helpers';
import { normalizeConsumerDocumentTags } from './consumer-document-tags.util';
import { PrismaService } from '../../../shared/prisma.service';
import { FileStorageService } from '../files/file-storage.service';

const SINGLE_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE =
  `This document is still attached to a draft payment request. ` +
  `Remove it from the draft before deleting it from Documents.`;
const MULTI_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE =
  `One or more selected documents are still attached to draft payment requests. ` +
  `Remove them from the draft before deleting them from Documents.`;
const SINGLE_NON_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE =
  `This document is attached to a non-draft payment request ` + `and cannot be deleted from Documents.`;
const MULTI_NON_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE =
  `One or more selected documents are attached to non-draft payment requests ` +
  `and cannot be deleted from Documents.`;

@Injectable()
export class ConsumerDocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: FileStorageService,
    private readonly documentAccessPolicy: ConsumerDocumentAccessPolicy,
    private readonly documentListQuery: ConsumerDocumentListQuery,
  ) {}

  private async assertDraftOwnedPaymentRequest(consumerId: string, paymentRequestId: string) {
    return this.documentAccessPolicy.assertDraftOwnedPaymentRequest(consumerId, paymentRequestId);
  }

  private async getConsumerEmail(consumerId: string): Promise<string | null> {
    const consumerModel = this.prisma.consumerModel;
    if (!consumerModel || typeof consumerModel.findUnique !== `function`) {
      return null;
    }

    const consumer = await consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });

    return consumer?.email?.trim().toLowerCase() ?? null;
  }

  async getDocuments(
    consumerId: string,
    kind?: string,
    page = 1,
    pageSize = 10,
    backendBaseUrl?: string,
    contactId?: string,
  ): Promise<{
    items: DocumentListItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.documentListQuery.list({
      consumerId,
      kind,
      page,
      pageSize,
      backendBaseUrl,
      contactId,
    });
  }

  async uploadDocuments(
    consumerId: string,
    files: Express.Multer.File[],
    backendBaseUrl?: string,
    paymentRequestId?: string,
  ) {
    const created: string[] = [];
    const targetPaymentRequest = paymentRequestId
      ? await this.assertDraftOwnedPaymentRequest(consumerId, paymentRequestId)
      : null;

    for (const file of files) {
      const originalName = Buffer.from(file.originalname, `latin1`).toString(`utf8`);

      const stored = await this.storage.upload(
        {
          buffer: file.buffer,
          originalName: originalName,
          mimetype: file.mimetype,
        },
        backendBaseUrl,
      );

      const resource = await this.prisma.resourceModel.create({
        data: {
          access: $Enums.ResourceAccess.PRIVATE,
          originalName: originalName,
          mimetype: file.mimetype,
          size: file.size,
          bucket: stored.bucket,
          key: stored.key,
          downloadUrl: stored.downloadUrl,
        },
      });

      await this.prisma.consumerResourceModel.create({
        data: {
          consumerId,
          resourceId: resource.id,
        },
      });

      if (targetPaymentRequest) {
        await this.prisma.paymentRequestAttachmentModel.create({
          data: {
            paymentRequestId: targetPaymentRequest.id,
            requesterId: consumerId,
            resourceId: resource.id,
          },
        });
      }

      created.push(resource.id);
    }

    return { ids: created };
  }

  async openDownload(consumerId: string, resourceId: string) {
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const resource = await this.prisma.resourceModel.findFirst({
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

    if (!resource) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    return this.storage.openDownloadStream(resource);
  }

  async bulkDeleteDocuments(consumerId: string, ids: string[]) {
    const normalizedIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map((id) => id?.trim()).filter(Boolean)));
    if (normalizedIds.length === 0) {
      return { success: true };
    }

    const ownedResources = await this.prisma.consumerResourceModel.findMany({
      where: {
        consumerId,
        resourceId: { in: normalizedIds },
      },
      select: { resourceId: true },
    });
    const ownedResourceIds = ownedResources.map((resource) => resource.resourceId);

    if (ownedResourceIds.length !== normalizedIds.length) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    const paymentAttachments = await this.prisma.paymentRequestAttachmentModel.findMany({
      where: {
        resourceId: { in: ownedResourceIds },
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

    const nonDraftBlockedResourceIds = new Set(
      paymentAttachments
        .filter((attachment) => attachment.paymentRequest.status !== $Enums.TransactionStatus.DRAFT)
        .map((attachment) => attachment.resourceId),
    );
    if (nonDraftBlockedResourceIds.size > 0) {
      throw new BadRequestException(
        nonDraftBlockedResourceIds.size === 1
          ? SINGLE_NON_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE
          : MULTI_NON_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE,
      );
    }

    const draftBlockedResourceIds = new Set(
      paymentAttachments
        .filter((attachment) => attachment.paymentRequest.status === $Enums.TransactionStatus.DRAFT)
        .map((attachment) => attachment.resourceId),
    );
    if (draftBlockedResourceIds.size > 0) {
      throw new BadRequestException(
        draftBlockedResourceIds.size === 1
          ? SINGLE_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE
          : MULTI_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE,
      );
    }

    await this.prisma.consumerResourceModel.deleteMany({
      where: {
        consumerId,
        resourceId: { in: ownedResourceIds },
      },
    });

    await this.prisma.resourceTagModel.deleteMany({
      where: {
        resourceId: { in: ownedResourceIds },
      },
    });

    return { success: true };
  }

  async deleteDocument(consumerId: string, id: string) {
    return this.bulkDeleteDocuments(consumerId, [id]);
  }

  private async getAccessibleAttachmentResources(
    consumerId: string,
    resourceIds: string[],
    consumerEmail: string | null,
  ) {
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

  async attachToPayment(consumerId: string, paymentRequestId: string, resourceIds: string[]) {
    const ids = Array.from(
      new Set((Array.isArray(resourceIds) ? resourceIds : []).map((id) => id?.trim()).filter(Boolean)),
    );
    if (ids.length === 0) {
      return { success: true };
    }

    await this.assertDraftOwnedPaymentRequest(consumerId, paymentRequestId);
    const consumerEmail = await this.getConsumerEmail(consumerId);

    const [ownedResources, accessibleAttachments] = await Promise.all([
      this.prisma.consumerResourceModel.findMany({
        where: {
          consumerId,
          resourceId: { in: ids },
          deletedAt: null,
          resource: {
            deletedAt: null,
          },
        },
        select: { resourceId: true },
      }),
      this.getAccessibleAttachmentResources(consumerId, ids, consumerEmail),
    ]);

    const accessibleResourceIds = new Set([
      ...ownedResources.map((resource) => resource.resourceId),
      ...accessibleAttachments.map((attachment) => attachment.resourceId),
    ]);

    if (ids.some((resourceId) => !accessibleResourceIds.has(resourceId))) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    const paymentRequestAttachments = await this.prisma.paymentRequestAttachmentModel.findMany({
      where: {
        paymentRequestId,
        resourceId: { in: ids },
        deletedAt: null,
      },
      select: { resourceId: true },
    });

    const existingAttachmentResourceIds = new Set(paymentRequestAttachments.map((attachment) => attachment.resourceId));

    const toCreate = ids.filter((resourceId) => !existingAttachmentResourceIds.has(resourceId));

    await this.prisma.paymentRequestAttachmentModel.createMany({
      data: toCreate.map((resourceId) => ({
        paymentRequestId,
        requesterId: consumerId,
        resourceId,
      })),
      skipDuplicates: true,
    });

    return { success: true };
  }

  async detachFromPayment(consumerId: string, paymentRequestId: string, resourceId: string) {
    const normalizedResourceId = resourceId.trim();
    if (!normalizedResourceId) {
      throw new BadRequestException(`Resource id is required`);
    }

    const paymentRequest = await this.assertDraftOwnedPaymentRequest(consumerId, paymentRequestId);

    await this.prisma.paymentRequestAttachmentModel.deleteMany({
      where: {
        paymentRequestId: paymentRequest.id,
        requesterId: consumerId,
        resourceId: normalizedResourceId,
      },
    });

    return { success: true };
  }

  async setTags(consumerId: string, resourceId: string, tags: string[]) {
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const [consumerResource, accessibleAttachment] = await Promise.all([
      this.prisma.consumerResourceModel.findFirst({
        where: {
          consumerId,
          resourceId,
          deletedAt: null,
          resource: {
            deletedAt: null,
          },
        },
      }),
      this.prisma.paymentRequestAttachmentModel.findFirst({
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
      }),
    ]);

    if (!consumerResource && !accessibleAttachment) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    const cleaned = normalizeConsumerDocumentTags(tags);

    const documentTags = [];
    for (const name of cleaned) {
      const documentTag = await this.prisma.documentTagModel.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      documentTags.push(documentTag);
    }

    await this.prisma.resourceTagModel.deleteMany({
      where: { resourceId },
    });

    await this.prisma.resourceTagModel.createMany({
      data: documentTags.map((documentTag) => ({
        resourceId,
        tagId: documentTag.id,
      })),
    });

    return { success: true };
  }
}
