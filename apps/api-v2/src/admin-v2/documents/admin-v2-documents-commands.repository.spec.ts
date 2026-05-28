import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';

import { AdminV2DocumentsCommandsRepository } from './admin-v2-documents-commands.repository';

describe(`AdminV2DocumentsCommandsRepository`, () => {
  function buildRepository() {
    const documentTagModel = {
      create: jest.fn<(...a: any[]) => any>(),
      updateMany: jest.fn<(...a: any[]) => any>(),
      findUnique: jest.fn<(...a: any[]) => any>(),
      findUniqueOrThrow: jest.fn<(...a: any[]) => any>(),
      deleteMany: jest.fn<(...a: any[]) => any>(),
    };
    const resourceModel = {
      updateMany: jest.fn<(...a: any[]) => any>(),
      findUnique: jest.fn<(...a: any[]) => any>(),
      findUniqueOrThrow: jest.fn<(...a: any[]) => any>(),
    };
    const resourceTagModel = {
      count: jest.fn<(...a: any[]) => any>(),
      deleteMany: jest.fn<(...a: any[]) => any>(),
      createMany: jest.fn<(...a: any[]) => any>(),
    };
    const adminActionAuditLogModel = {
      create: jest.fn<(...a: any[]) => any>(),
    };
    const tx = {
      documentTagModel,
      resourceModel,
      resourceTagModel,
      adminActionAuditLogModel,
    };
    const prisma = {
      $transaction: jest.fn<(...a: any[]) => any>(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };

    return {
      repository: new AdminV2DocumentsCommandsRepository(
        prisma as never,
        { run: (callback: (tx: unknown) => Promise<unknown>) => prisma.$transaction(callback as never) } as never,
      ),
      documentTagModel,
      resourceModel,
      resourceTagModel,
      adminActionAuditLogModel,
    };
  }

  it(`creates a tag and records document_tag_create audit metadata`, async () => {
    const { repository, documentTagModel, adminActionAuditLogModel } = buildRepository();
    const updatedAt = new Date(`2026-04-17T09:00:00.000Z`);
    documentTagModel.create.mockResolvedValueOnce({
      id: `tag-1`,
      name: `evidence`,
      updatedAt,
    });

    await expect(
      repository.createTagWithAudit({
        adminId: `admin-1`,
        name: `evidence`,
        meta: { ipAddress: `127.0.0.1`, userAgent: `jest` },
      }),
    ).resolves.toEqual({
      id: `tag-1`,
      name: `evidence`,
      updatedAt,
    });

    expect(adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `document_tag_create`,
          resourceId: `tag-1`,
          metadata: { tagName: `evidence` },
        }),
      }),
    );
  });

  it(`maps stale updateTag optimistic-lock failures to ConflictException`, async () => {
    const { repository, documentTagModel } = buildRepository();
    const currentUpdatedAt = new Date(`2026-04-17T10:05:00.000Z`);
    documentTagModel.updateMany.mockResolvedValueOnce({ count: 0 });
    documentTagModel.findUnique.mockResolvedValueOnce({ updatedAt: currentUpdatedAt });

    await expect(
      repository.updateTagWithAudit({
        tag: {
          id: `tag-1`,
          name: `evidence`,
          updatedAt: new Date(`2026-04-17T10:00:00.000Z`),
        },
        adminId: `admin-1`,
        nextName: `verified`,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it(`deletes a tag and returns the affected resource count`, async () => {
    const { repository, resourceTagModel, documentTagModel, adminActionAuditLogModel } = buildRepository();
    resourceTagModel.count.mockResolvedValueOnce(2);
    documentTagModel.deleteMany.mockResolvedValueOnce({ count: 1 });

    await expect(
      repository.deleteTagWithAudit({
        tag: {
          id: `tag-1`,
          name: `evidence`,
          updatedAt: new Date(`2026-04-17T11:00:00.000Z`),
        },
        adminId: `admin-1`,
      }),
    ).resolves.toEqual({
      tagId: `tag-1`,
      affectedResourceCount: 2,
    });

    expect(adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `document_tag_delete`,
          metadata: expect.objectContaining({
            affectedResourceCount: 2,
            confirmed: true,
          }),
        }),
      }),
    );
  });

  it(`clears document tags without recreating associations when next tag set is empty`, async () => {
    const { repository, resourceModel, resourceTagModel, adminActionAuditLogModel } = buildRepository();
    const nextUpdatedAt = new Date(`2026-04-17T12:05:00.000Z`);
    resourceModel.updateMany.mockResolvedValueOnce({ count: 1 });
    resourceTagModel.deleteMany.mockResolvedValueOnce({ count: 1 });
    resourceModel.findUniqueOrThrow.mockResolvedValueOnce({ updatedAt: nextUpdatedAt });

    await expect(
      repository.replaceDocumentTagsWithAudit({
        resource: {
          id: `doc-1`,
          updatedAt: new Date(`2026-04-17T12:00:00.000Z`),
          resourceTags: [{ tag: { id: `tag-old`, name: `old-tag` } }],
        },
        adminId: `admin-1`,
        allowedTags: [],
      }),
    ).resolves.toEqual({
      resourceId: `doc-1`,
      tagIds: [],
      updatedAt: nextUpdatedAt,
    });

    expect(resourceTagModel.createMany).not.toHaveBeenCalled();
    expect(adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `document_retag`,
          metadata: expect.objectContaining({
            nextTagIds: [],
            nextTagNames: [],
          }),
        }),
      }),
    );
  });

  it(`fails bulk tagging when a document version changes inside the transaction`, async () => {
    const { repository, resourceModel } = buildRepository();
    const currentUpdatedAt = new Date(`2026-04-17T13:05:00.000Z`);
    resourceModel.updateMany.mockResolvedValueOnce({ count: 0 });
    resourceModel.findUnique.mockResolvedValueOnce({ updatedAt: currentUpdatedAt });

    await expect(
      repository.bulkAttachTagsWithAudit({
        adminId: `admin-1`,
        documents: [{ id: `doc-1`, updatedAt: new Date(`2026-04-17T13:00:00.000Z`) }],
        allowedTags: [{ id: `tag-1`, name: `evidence` }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
