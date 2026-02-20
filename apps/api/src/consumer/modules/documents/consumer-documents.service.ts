import { Injectable, ForbiddenException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { PrismaService } from '../../../shared/prisma.service';
import { FileStorageService } from '../files/file-storage.service';

@Injectable()
export class ConsumerDocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: FileStorageService,
  ) {}

  async getDocuments(
    consumerId: string,
    kind?: string,
    page = 1,
    pageSize = 10,
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
          select: { id: true },
        },
      },
      orderBy: { createdAt: `desc` },
    });

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
      })),
    ];

    // 2️⃣ Deduplicate by resourceId
    const byResource = new Map<string, (typeof all)[number]>();

    for (const doc of all) {
      const existing = byResource.get(doc.resourceId);

      // Keep the newest entry if duplicates exist
      if (!existing || doc.createdAt > existing.createdAt) {
        byResource.set(doc.resourceId, doc);
      }
    }

    // 3️⃣ Convert map → array and sort
    let result = Array.from(byResource.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((doc) => ({
        id: doc.resourceId,
        name: doc.name,
        size: doc.size,
        createdAt: doc.createdAt.toISOString(),
        downloadUrl: doc.downloadUrl,
        mimetype: doc.mimetype,
        kind: doc.kind,
        tags: doc.tags,
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

  async uploadDocuments(consumerId: string, files: Express.Multer.File[], backendHost) {
    const created: any[] = [];

    for (const file of files) {
      const originalName = Buffer.from(file.originalname, `latin1`).toString(`utf8`);

      const stored = await this.storage.upload(
        {
          buffer: file.buffer,
          originalName: originalName,
          mimetype: file.mimetype,
        },
        backendHost,
      );

      const resource = await this.prisma.resourceModel.create({
        data: {
          access: $Enums.ResourceAccess.PUBLIC,
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

      created.push(resource.id);
    }

    return { ids: created };
  }

  async bulkDeleteDocuments(consumerId: string, ids: string[]) {
    await this.prisma.consumerResourceModel.deleteMany({
      where: {
        consumerId,
        resourceId: { in: ids },
      },
    });

    await this.prisma.resourceTagModel.deleteMany({
      where: {
        resourceId: { in: ids },
      },
    });

    await this.prisma.paymentRequestAttachmentModel.deleteMany({
      where: {
        resourceId: { in: ids },
      },
    });

    return { success: true };
  }

  async attachToPayment(consumerId: string, paymentRequestId: string, resourceIds: string[]) {
    const payment = await this.prisma.paymentRequestModel.findFirst({
      where: {
        OR: [
          {
            id: paymentRequestId,
            payerId: consumerId,
          },
          {
            id: paymentRequestId,
            requesterId: consumerId,
          },
        ],
      },
    });

    if (!payment) {
      throw new ForbiddenException(errorCodes.PAYMENT_NOT_OWNED);
    }

    const paymentRequestAttachments = await this.prisma.paymentRequestAttachmentModel.findMany({
      where: {
        paymentRequestId,
        resourceId: { in: resourceIds },
      },
      select: { resourceId: true },
    });

    const existingAttachmentResourceIds = new Set(paymentRequestAttachments.map((attachment) => attachment.resourceId));

    const toCreate = resourceIds.filter((resourceId) => !existingAttachmentResourceIds.has(resourceId));

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
