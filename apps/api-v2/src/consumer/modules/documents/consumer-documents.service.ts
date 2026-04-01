import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { buildConsumerDocumentDownloadUrl } from './document-download-url';
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
  ) {}

  private async assertDraftOwnedPaymentRequest(consumerId: string, paymentRequestId: string) {
    const normalizedPaymentRequestId = paymentRequestId.trim();
    if (!normalizedPaymentRequestId) {
      throw new BadRequestException(`Payment request id is required`);
    }

    const payment = await this.prisma.paymentRequestModel.findFirst({
      where: {
        id: normalizedPaymentRequestId,
        requesterId: consumerId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!payment) {
      throw new ForbiddenException(errorCodes.PAYMENT_NOT_OWNED);
    }

    if (payment.status !== $Enums.TransactionStatus.DRAFT) {
      throw new BadRequestException(`Only draft payment requests can accept attachments`);
    }

    return payment;
  }

  private async getConsumerEmail(consumerId: string): Promise<string | null> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });

    return consumer?.email?.trim().toLowerCase() ?? null;
  }

  private buildPaymentParticipantWhere(consumerId: string, consumerEmail: string | null) {
    return [
      { requesterId: consumerId },
      { payerId: consumerId },
      ...(consumerEmail
        ? [
            {
              requesterId: null,
              requesterEmail: { equals: consumerEmail, mode: `insensitive` as const },
            },
            {
              payerId: null,
              payerEmail: { equals: consumerEmail, mode: `insensitive` as const },
            },
          ]
        : []),
    ];
  }

  async getDocuments(
    consumerId: string,
    kind?: string,
    page = 1,
    pageSize = 10,
    backendBaseUrl?: string,
  ): Promise<{
    items: Array<{
      id: string;
      name: string;
      size: number;
      createdAt: string;
      downloadUrl: string;
      mimetype: string | null;
      kind: string;
      tags: string[];
      isAttachedToDraftPaymentRequest: boolean;
      attachedDraftPaymentRequestIds: string[];
      isAttachedToNonDraftPaymentRequest: boolean;
      attachedNonDraftPaymentRequestIds: string[];
    }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const consumerResources = await this.prisma.consumerResourceModel.findMany({
      where: { consumerId },
      include: {
        resource: {
          include: {
            resourceTags: {
              include: { tag: true },
            },
          },
        },
      },
      orderBy: { createdAt: `desc` },
    });

    const paymentRequestAttachments = await this.prisma.paymentRequestAttachmentModel.findMany({
      where: { requesterId: consumerId },
      include: {
        resource: {
          include: {
            resourceTags: {
              include: { tag: true },
            },
          },
        },
        paymentRequest: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: `desc` },
    });

    const draftAttachmentIdsByResource = new Map<string, Set<string>>();
    const nonDraftAttachmentIdsByResource = new Map<string, Set<string>>();
    for (const attachment of paymentRequestAttachments) {
      const attachmentIdsByResource =
        attachment.paymentRequest.status === $Enums.TransactionStatus.DRAFT
          ? draftAttachmentIdsByResource
          : nonDraftAttachmentIdsByResource;
      const existingIds = attachmentIdsByResource.get(attachment.resource.id) ?? new Set<string>();
      existingIds.add(attachment.paymentRequest.id);
      attachmentIdsByResource.set(attachment.resource.id, existingIds);
    }

    // 1️⃣ Normalize both sources into the same shape
    const all = [
      ...consumerResources.map((cr) => ({
        resourceId: cr.resource.id,
        name: cr.resource.originalName,
        size: cr.resource.size,
        createdAt: cr.resource.createdAt ?? cr.createdAt,
        downloadUrl: cr.resource.downloadUrl,
        mimetype: cr.resource.mimetype,
        kind: this.detectKind(cr.resource.originalName),
        tags: cr.resource.resourceTags.map((rt) => rt.tag.name),
        attachedDraftPaymentRequestIds: Array.from(draftAttachmentIdsByResource.get(cr.resource.id) ?? []),
        attachedNonDraftPaymentRequestIds: Array.from(nonDraftAttachmentIdsByResource.get(cr.resource.id) ?? []),
      })),
      ...paymentRequestAttachments.map((pa) => ({
        resourceId: pa.resource.id,
        name: pa.resource.originalName,
        size: pa.resource.size,
        createdAt: pa.resource.createdAt ?? pa.createdAt,
        downloadUrl: pa.resource.downloadUrl,
        mimetype: pa.resource.mimetype,
        kind: `PAYMENT`,
        tags: pa.resource.resourceTags.map((rt) => rt.tag.name),
        attachedDraftPaymentRequestIds: Array.from(draftAttachmentIdsByResource.get(pa.resource.id) ?? []),
        attachedNonDraftPaymentRequestIds: Array.from(nonDraftAttachmentIdsByResource.get(pa.resource.id) ?? []),
      })),
    ];

    // 2️⃣ Deduplicate by resourceId
    const byResource = new Map<string, (typeof all)[number]>();

    for (const doc of all) {
      const existing = byResource.get(doc.resourceId);
      const mergedDraftPaymentRequestIds = Array.from(
        new Set([...(existing?.attachedDraftPaymentRequestIds ?? []), ...doc.attachedDraftPaymentRequestIds]),
      );
      const mergedNonDraftPaymentRequestIds = Array.from(
        new Set([...(existing?.attachedNonDraftPaymentRequestIds ?? []), ...doc.attachedNonDraftPaymentRequestIds]),
      );

      // Keep the newest entry if duplicates exist
      if (!existing || doc.createdAt > existing.createdAt) {
        byResource.set(doc.resourceId, {
          ...doc,
          attachedDraftPaymentRequestIds: mergedDraftPaymentRequestIds,
          attachedNonDraftPaymentRequestIds: mergedNonDraftPaymentRequestIds,
        });
        continue;
      }

      byResource.set(doc.resourceId, {
        ...existing,
        attachedDraftPaymentRequestIds: mergedDraftPaymentRequestIds,
        attachedNonDraftPaymentRequestIds: mergedNonDraftPaymentRequestIds,
      });
    }

    // 3️⃣ Convert map → array and sort
    let result = Array.from(byResource.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((doc) => ({
        id: doc.resourceId,
        name: doc.name,
        size: doc.size,
        createdAt: doc.createdAt.toISOString(),
        downloadUrl: buildConsumerDocumentDownloadUrl(doc.resourceId, backendBaseUrl),
        mimetype: doc.mimetype,
        kind: doc.kind,
        tags: doc.tags,
        isAttachedToDraftPaymentRequest: doc.attachedDraftPaymentRequestIds.length > 0,
        attachedDraftPaymentRequestIds: doc.attachedDraftPaymentRequestIds,
        isAttachedToNonDraftPaymentRequest: doc.attachedNonDraftPaymentRequestIds.length > 0,
        attachedNonDraftPaymentRequestIds: doc.attachedNonDraftPaymentRequestIds,
      }));

    // 4️⃣ Optional filter
    if (kind) {
      result = result.filter((document) => document.kind === kind.toUpperCase());
    }

    const total = result.length;
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safePageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 10));
    const start = (safePage - 1) * safePageSize;
    const items = result.slice(start, start + safePageSize);

    return { items, total, page: safePage, pageSize: safePageSize };
  }

  private detectKind(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.includes(`w9`) || lower.includes(`w-9`)) return `COMPLIANCE`;
    if (lower.includes(`contract`)) return `CONTRACT`;
    if (lower.includes(`invoice`)) return `PAYMENT`;
    return `GENERAL`;
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
                      OR: this.buildPaymentParticipantWhere(consumerId, consumerEmail),
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

  async attachToPayment(consumerId: string, paymentRequestId: string, resourceIds: string[]) {
    const ids = Array.from(
      new Set((Array.isArray(resourceIds) ? resourceIds : []).map((id) => id?.trim()).filter(Boolean)),
    );
    if (ids.length === 0) {
      return { success: true };
    }

    await this.assertDraftOwnedPaymentRequest(consumerId, paymentRequestId);

    const [ownedResources, requesterAttachments] = await Promise.all([
      this.prisma.consumerResourceModel.findMany({
        where: {
          consumerId,
          resourceId: { in: ids },
        },
        select: { resourceId: true },
      }),
      this.prisma.paymentRequestAttachmentModel.findMany({
        where: {
          requesterId: consumerId,
          resourceId: { in: ids },
        },
        select: { resourceId: true },
      }),
    ]);

    const accessibleResourceIds = new Set([
      ...ownedResources.map((resource) => resource.resourceId),
      ...requesterAttachments.map((attachment) => attachment.resourceId),
    ]);

    if (ids.some((resourceId) => !accessibleResourceIds.has(resourceId))) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    const paymentRequestAttachments = await this.prisma.paymentRequestAttachmentModel.findMany({
      where: {
        paymentRequestId,
        resourceId: { in: ids },
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
    // ensure consumer has access
    const consumerResource = await this.prisma.consumerResourceModel.findFirst({
      where: { consumerId, resourceId },
    });

    if (!consumerResource) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    // normalize tags
    const cleaned = tags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => tag.toLowerCase());

    // upsert tag records
    const documentTags = [];
    for (const name of cleaned) {
      const documentTag = await this.prisma.documentTagModel.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      documentTags.push(documentTag);
    }

    // remove old links
    await this.prisma.resourceTagModel.deleteMany({
      where: { resourceId },
    });

    // add current links
    await this.prisma.resourceTagModel.createMany({
      data: documentTags.map((documentTag) => ({
        resourceId,
        tagId: documentTag.id,
      })),
    });

    return { success: true };
  }
}
