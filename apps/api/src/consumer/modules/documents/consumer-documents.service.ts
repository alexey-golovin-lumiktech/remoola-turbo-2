import { Injectable, ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma.service';
import { FileStorageService } from '../files/file-storage.service';

@Injectable()
export class ConsumerDocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: FileStorageService,
  ) {}

  async getDocuments(consumerId: string, kind?: string) {
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

    const merged = [
      ...consumerResources.map((consumerResource) => ({
        id: consumerResource.resource.id,
        name: consumerResource.resource.originalName,
        size: consumerResource.resource.size,
        createdAt: consumerResource.resource.createdAt?.toISOString() ?? ``,
        downloadUrl: consumerResource.resource.downloadUrl,
        mimetype: consumerResource.resource.mimetype,
        kind: this.detectKind(consumerResource.resource.originalName),
        tags: consumerResource.resource.resourceTags.map((resourceTag) => resourceTag.tag.name),
      })),
      ...paymentRequestAttachments.map((paymentRequestAttachment) => ({
        id: paymentRequestAttachment.resource.id,
        name: paymentRequestAttachment.resource.originalName,
        size: paymentRequestAttachment.resource.size,
        createdAt: paymentRequestAttachment.resource.createdAt?.toISOString() ?? ``,
        downloadUrl: paymentRequestAttachment.resource.downloadUrl,
        mimetype: paymentRequestAttachment.resource.mimetype,
        kind: `PAYMENT`,
        tags: paymentRequestAttachment.resource.resourceTags.map((resourceTag) => resourceTag.tag.name),
      })),
    ];

    if (kind) {
      return merged.filter((document) => document.kind === kind.toUpperCase());
    }

    return merged;
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
          originalname: originalName,
          mimetype: file.mimetype,
        },
        backendHost,
      );

      const resource = await this.prisma.resourceModel.create({
        data: {
          access: `public`,
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
      throw new ForbiddenException(`Payment not found or not owned by you`);
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
      throw new ForbiddenException(`No access to this document`);
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
