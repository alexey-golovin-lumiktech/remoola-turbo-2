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
    const docs = await this.prisma.consumerResourceModel.findMany({
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

    const paymentAtt = await this.prisma.paymentRequestAttachmentModel.findMany({
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
      ...docs.map((cr) => ({
        id: cr.resource.id,
        name: cr.resource.originalName,
        size: cr.resource.size,
        createdAt: cr.resource.createdAt?.toISOString() ?? ``,
        downloadUrl: cr.resource.downloadUrl,
        mimetype: cr.resource.mimetype,
        kind: this.detectKind(cr.resource.originalName),
        tags: cr.resource.resourceTags.map((rt) => rt.tag.name),
      })),
      ...paymentAtt.map((att) => ({
        id: att.resource.id,
        name: att.resource.originalName,
        size: att.resource.size,
        createdAt: att.resource.createdAt?.toISOString() ?? ``,
        downloadUrl: att.resource.downloadUrl,
        mimetype: att.resource.mimetype,
        kind: `PAYMENT`,
        tags: att.resource.resourceTags.map((rt) => rt.tag.name),
      })),
    ];

    if (kind) {
      return merged.filter((d) => d.kind === kind.toUpperCase());
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

    return { success: true };
  }

  async attachToPayment(consumerId: string, paymentRequestId: string, resourceIds: string[]) {
    const payment = await this.prisma.paymentRequestModel.findFirst({
      where: {
        id: paymentRequestId,
        requesterId: consumerId,
      },
    });

    if (!payment) {
      throw new ForbiddenException(`Payment not found or not owned by you`);
    }

    const existing = await this.prisma.paymentRequestAttachmentModel.findMany({
      where: {
        paymentRequestId,
        resourceId: { in: resourceIds },
      },
      select: { resourceId: true },
    });

    const existingIds = new Set(existing.map((e) => e.resourceId));

    const toCreate = resourceIds.filter((id) => !existingIds.has(id));

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
    const cr = await this.prisma.consumerResourceModel.findFirst({
      where: { consumerId, resourceId },
    });

    if (!cr) {
      throw new ForbiddenException(`No access to this document`);
    }

    // normalize tags
    const cleaned = tags
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase());

    // upsert tag records
    const tagRecords = [];
    for (const name of cleaned) {
      const tag = await this.prisma.documentTagModel.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      tagRecords.push(tag);
    }

    // remove old links
    await this.prisma.resourceTagModel.deleteMany({
      where: { resourceId },
    });

    // add current links
    await this.prisma.resourceTagModel.createMany({
      data: tagRecords.map((tag) => ({
        resourceId,
        tagId: tag.id,
      })),
    });

    return { success: true };
  }
}
