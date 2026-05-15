import { ConflictException, Injectable } from '@nestjs/common';

import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { PrismaService } from '../../shared/prisma.service';

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

function deriveVersion(updatedAt: Date) {
  return updatedAt.getTime();
}

function buildStaleVersionPayload(resourceLabel: string, currentUpdatedAt: Date) {
  return {
    error: `STALE_VERSION`,
    message: `${resourceLabel} has been modified by another operator`,
    currentVersion: deriveVersion(currentUpdatedAt),
    currentUpdatedAt: currentUpdatedAt.toISOString(),
    recommendedAction: `reload`,
  };
}

@Injectable()
export class AdminV2DocumentsCommandsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  createTagWithAudit(params: { adminId: string; name: string; meta?: RequestMeta }) {
    return this.transactions.run(async (tx) => {
      const created = await tx.documentTagModel.create({
        data: { name: params.name },
      });

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId: params.adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.document_tag_create,
          resource: `document_tag`,
          resourceId: created.id,
          metadata: {
            tagName: created.name,
          },
          ipAddress: params.meta?.ipAddress ?? null,
          userAgent: params.meta?.userAgent ?? null,
        },
      });

      return created;
    });
  }

  updateTagWithAudit(params: {
    tag: { id: string; name: string; updatedAt: Date };
    adminId: string;
    nextName: string;
    meta?: RequestMeta;
  }) {
    return this.transactions.run(async (tx) => {
      const updated = await tx.documentTagModel.updateMany({
        where: {
          id: params.tag.id,
          updatedAt: params.tag.updatedAt,
        },
        data: {
          name: params.nextName,
        },
      });

      if (updated.count === 0) {
        const current = await tx.documentTagModel.findUnique({
          where: { id: params.tag.id },
          select: { updatedAt: true },
        });
        throw new ConflictException(
          current ? buildStaleVersionPayload(`Document tag`, current.updatedAt) : `Document tag has changed`,
        );
      }

      const fresh = await tx.documentTagModel.findUniqueOrThrow({
        where: { id: params.tag.id },
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
      });

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId: params.adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.document_tag_update,
          resource: `document_tag`,
          resourceId: fresh.id,
          metadata: {
            previousName: params.tag.name,
            nextName: fresh.name,
          },
          ipAddress: params.meta?.ipAddress ?? null,
          userAgent: params.meta?.userAgent ?? null,
        },
      });

      return fresh;
    });
  }

  deleteTagWithAudit(params: {
    tag: { id: string; name: string; updatedAt: Date };
    adminId: string;
    meta?: RequestMeta;
  }) {
    return this.transactions.run(async (tx) => {
      const affectedResourceCount = await tx.resourceTagModel.count({
        where: { tagId: params.tag.id },
      });

      const deleted = await tx.documentTagModel.deleteMany({
        where: {
          id: params.tag.id,
          updatedAt: params.tag.updatedAt,
        },
      });

      if (deleted.count === 0) {
        const current = await tx.documentTagModel.findUnique({
          where: { id: params.tag.id },
          select: { updatedAt: true },
        });
        throw new ConflictException(
          current ? buildStaleVersionPayload(`Document tag`, current.updatedAt) : `Document tag has changed`,
        );
      }

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId: params.adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.document_tag_delete,
          resource: `document_tag`,
          resourceId: params.tag.id,
          metadata: {
            tagName: params.tag.name,
            affectedResourceCount,
            confirmed: true,
          },
          ipAddress: params.meta?.ipAddress ?? null,
          userAgent: params.meta?.userAgent ?? null,
        },
      });

      return {
        tagId: params.tag.id,
        affectedResourceCount,
      };
    });
  }

  replaceDocumentTagsWithAudit(params: {
    resource: {
      id: string;
      updatedAt: Date;
      resourceTags: Array<{ tag: { id: string; name: string } }>;
    };
    adminId: string;
    allowedTags: Array<{ id: string; name: string }>;
    meta?: RequestMeta;
  }) {
    return this.transactions.run(async (tx) => {
      const touchedAt = new Date();
      const updated = await tx.resourceModel.updateMany({
        where: {
          id: params.resource.id,
          updatedAt: params.resource.updatedAt,
          deletedAt: null,
        },
        data: {
          updatedAt: touchedAt,
        },
      });

      if (updated.count === 0) {
        const current = await tx.resourceModel.findUnique({
          where: { id: params.resource.id },
          select: { updatedAt: true },
        });
        throw new ConflictException(
          current ? buildStaleVersionPayload(`Document`, current.updatedAt) : `Document has changed`,
        );
      }

      await tx.resourceTagModel.deleteMany({
        where: { resourceId: params.resource.id },
      });

      if (params.allowedTags.length > 0) {
        await tx.resourceTagModel.createMany({
          data: params.allowedTags.map((tag) => ({
            resourceId: params.resource.id,
            tagId: tag.id,
          })),
          skipDuplicates: true,
        });
      }

      const fresh = await tx.resourceModel.findUniqueOrThrow({
        where: { id: params.resource.id },
        select: {
          updatedAt: true,
        },
      });

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId: params.adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.document_retag,
          resource: `document`,
          resourceId: params.resource.id,
          metadata: {
            previousTagIds: params.resource.resourceTags.map((resourceTag) => resourceTag.tag.id),
            previousTagNames: params.resource.resourceTags.map((resourceTag) => resourceTag.tag.name),
            nextTagIds: params.allowedTags.map((tag) => tag.id),
            nextTagNames: params.allowedTags.map((tag) => tag.name),
          },
          ipAddress: params.meta?.ipAddress ?? null,
          userAgent: params.meta?.userAgent ?? null,
        },
      });

      return {
        resourceId: params.resource.id,
        tagIds: params.allowedTags.map((tag) => tag.id),
        updatedAt: fresh.updatedAt,
      };
    });
  }

  bulkAttachTagsWithAudit(params: {
    adminId: string;
    documents: Array<{ id: string; updatedAt: Date }>;
    allowedTags: Array<{ id: string; name: string }>;
    meta?: RequestMeta;
  }) {
    return this.transactions.run(async (tx) => {
      const touchedAt = new Date();

      for (const document of params.documents) {
        const updated = await tx.resourceModel.updateMany({
          where: {
            id: document.id,
            updatedAt: document.updatedAt,
            deletedAt: null,
          },
          data: {
            updatedAt: touchedAt,
          },
        });

        if (updated.count === 0) {
          const fresh = await tx.resourceModel.findUnique({
            where: { id: document.id },
            select: { updatedAt: true },
          });
          throw new ConflictException(
            fresh ? buildStaleVersionPayload(`Document`, fresh.updatedAt) : `Document has changed`,
          );
        }
      }

      const createManyResult = await tx.resourceTagModel.createMany({
        data: params.documents.flatMap((document) =>
          params.allowedTags.map((tag) => ({
            resourceId: document.id,
            tagId: tag.id,
          })),
        ),
        skipDuplicates: true,
      });

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId: params.adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.document_bulk_tag,
          resource: `document_batch`,
          resourceId: null,
          metadata: {
            tagIds: params.allowedTags.map((tag) => tag.id),
            tagNames: params.allowedTags.map((tag) => tag.name),
            targetResourceIds: params.documents.map((document) => document.id),
            targetCount: params.documents.length,
            associationsCreated: createManyResult.count,
          },
          ipAddress: params.meta?.ipAddress ?? null,
          userAgent: params.meta?.userAgent ?? null,
        },
      });

      return {
        targetCount: params.documents.length,
        tagCount: params.allowedTags.length,
        associationsCreated: createManyResult.count,
      };
    });
  }
}
