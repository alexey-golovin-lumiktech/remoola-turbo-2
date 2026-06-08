import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { createAssignmentsService, createIdempotency, TestAdminDocumentService } from './admin-documents.test-helpers';

describe(`AdminDocumentTagService`, () => {
  it(`returns exact tag usage stats and marks reserved invoice tags as read-only`, async () => {
    const service = new TestAdminDocumentService(
      {
        documentTagModel: {
          findMany: jest.fn<(...a: any[]) => any>(async () => [
            {
              id: `tag-1`,
              name: `evidence`,
              createdAt: new Date(`2026-04-17T08:00:00.000Z`),
              updatedAt: new Date(`2026-04-17T08:05:00.000Z`),
              _count: { resourceTags: 3 },
            },
            {
              id: `tag-2`,
              name: `INVOICE-PENDING`,
              createdAt: new Date(`2026-04-17T08:00:00.000Z`),
              updatedAt: new Date(`2026-04-17T08:06:00.000Z`),
              _count: { resourceTags: 1 },
            },
          ]),
        },
      } as never,
      {} as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(service.tagService.listTags()).resolves.toEqual({
      items: [
        {
          id: `tag-1`,
          name: `evidence`,
          reserved: false,
          usageCount: 3,
          createdAt: `2026-04-17T08:00:00.000Z`,
          updatedAt: `2026-04-17T08:05:00.000Z`,
          version: new Date(`2026-04-17T08:05:00.000Z`).getTime(),
        },
        {
          id: `tag-2`,
          name: `INVOICE-PENDING`,
          reserved: true,
          usageCount: 1,
          createdAt: `2026-04-17T08:00:00.000Z`,
          updatedAt: `2026-04-17T08:06:00.000Z`,
          version: new Date(`2026-04-17T08:06:00.000Z`).getTime(),
        },
      ],
    });
  });

  it(`records document_tag_create with exact audit vocabulary`, async () => {
    const adminActionAuditLogModel = {
      create: jest.fn<(...a: any[]) => any>(async () => ({ id: `audit-1` })),
    };
    const documentTagModel = {
      findUnique: jest.fn<(...a: any[]) => any>(async () => null),
      create: jest.fn<(...a: any[]) => any>(async () => ({
        id: `tag-1`,
        name: `evidence`,
        updatedAt: new Date(`2026-04-17T09:00:00.000Z`),
      })),
    };
    const prisma = {
      documentTagModel,
      adminActionAuditLogModel,
      $transaction: jest.fn<(...a: any[]) => any>(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(prisma),
      ),
    };
    const service = new TestAdminDocumentService(
      prisma as never,
      {} as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(
      service.tagService.createTag(`admin-1`, { name: `evidence` }, { idempotencyKey: `idem-1`, userAgent: `jest` }),
    ).resolves.toEqual({
      tagId: `tag-1`,
      name: `evidence`,
      version: new Date(`2026-04-17T09:00:00.000Z`).getTime(),
      updatedAt: `2026-04-17T09:00:00.000Z`,
      alreadyExists: false,
    });

    expect(adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `document_tag_create`,
          resource: `document_tag`,
          resourceId: `tag-1`,
        }),
      }),
    );
  });

  it(`short-circuits duplicate tag creates before entering the mutation repository`, async () => {
    const documentTagModel = {
      findUnique: jest.fn<(...a: any[]) => any>(async () => ({
        id: `tag-1`,
        name: `evidence`,
        updatedAt: new Date(`2026-04-17T09:00:00.000Z`),
      })),
      create: jest.fn<(...a: any[]) => any>(),
    };
    const adminActionAuditLogModel = {
      create: jest.fn<(...a: any[]) => any>(),
    };
    const prisma = {
      documentTagModel,
      adminActionAuditLogModel,
      $transaction: jest.fn<(...a: any[]) => any>(),
    };
    const service = new TestAdminDocumentService(
      prisma as never,
      {} as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(
      service.tagService.createTag(
        `admin-1`,
        { name: `evidence` },
        { idempotencyKey: `idem-duplicate`, userAgent: `jest` },
      ),
    ).resolves.toEqual({
      tagId: `tag-1`,
      name: `evidence`,
      version: new Date(`2026-04-17T09:00:00.000Z`).getTime(),
      updatedAt: `2026-04-17T09:00:00.000Z`,
      alreadyExists: true,
    });

    expect(documentTagModel.create).not.toHaveBeenCalled();
    expect(adminActionAuditLogModel.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it(`records document_tag_update with stale protection`, async () => {
    const originalUpdatedAt = new Date(`2026-04-17T10:00:00.000Z`);
    const nextUpdatedAt = new Date(`2026-04-17T10:05:00.000Z`);
    const adminActionAuditLogModel = {
      create: jest.fn<(...a: any[]) => any>(async () => ({ id: `audit-1` })),
    };
    const documentTagModel = {
      findUnique: jest
        .fn<(...a: any[]) => any>()
        .mockResolvedValueOnce({
          id: `tag-1`,
          name: `evidence`,
          updatedAt: originalUpdatedAt,
        })
        .mockResolvedValueOnce(null),
      updateMany: jest.fn<(...a: any[]) => any>(async () => ({ count: 1 })),
      findUniqueOrThrow: jest.fn<(...a: any[]) => any>(async () => ({
        id: `tag-1`,
        name: `verified`,
        updatedAt: nextUpdatedAt,
      })),
    };
    const prisma = {
      documentTagModel,
      adminActionAuditLogModel,
      $transaction: jest.fn<(...a: any[]) => any>(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(prisma),
      ),
    };
    const service = new TestAdminDocumentService(
      prisma as never,
      {} as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(
      service.tagService.updateTag(
        `tag-1`,
        `admin-1`,
        { name: `verified`, version: originalUpdatedAt.getTime() },
        { idempotencyKey: `idem-2` },
      ),
    ).resolves.toEqual({
      tagId: `tag-1`,
      name: `verified`,
      version: nextUpdatedAt.getTime(),
      updatedAt: `2026-04-17T10:05:00.000Z`,
      unchanged: false,
    });

    expect(adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `document_tag_update`,
          resourceId: `tag-1`,
        }),
      }),
    );
  });

  it(`returns unchanged for a no-op tag rename without entering the mutation repository`, async () => {
    const updatedAt = new Date(`2026-04-17T10:00:00.000Z`);
    const tag = {
      id: `tag-1`,
      name: `evidence`,
      updatedAt,
    };
    const documentTagModel = {
      findUnique: jest.fn<(...a: any[]) => any>().mockResolvedValueOnce(tag).mockResolvedValueOnce(tag),
      updateMany: jest.fn<(...a: any[]) => any>(),
    };
    const adminActionAuditLogModel = {
      create: jest.fn<(...a: any[]) => any>(),
    };
    const prisma = {
      documentTagModel,
      adminActionAuditLogModel,
      $transaction: jest.fn<(...a: any[]) => any>(),
    };
    const service = new TestAdminDocumentService(
      prisma as never,
      {} as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(
      service.tagService.updateTag(
        `tag-1`,
        `admin-1`,
        { name: `evidence`, version: updatedAt.getTime() },
        { idempotencyKey: `idem-unchanged` },
      ),
    ).resolves.toEqual({
      tagId: `tag-1`,
      name: `evidence`,
      version: updatedAt.getTime(),
      updatedAt: `2026-04-17T10:00:00.000Z`,
      unchanged: true,
    });

    expect(documentTagModel.updateMany).not.toHaveBeenCalled();
    expect(adminActionAuditLogModel.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it(`requires confirmation and records document_tag_delete`, async () => {
    const updatedAt = new Date(`2026-04-17T11:00:00.000Z`);
    const adminActionAuditLogModel = {
      create: jest.fn<(...a: any[]) => any>(async () => ({ id: `audit-1` })),
    };
    const documentTagModel = {
      findUnique: jest.fn<(...a: any[]) => any>(async () => ({
        id: `tag-1`,
        name: `evidence`,
        updatedAt,
      })),
      deleteMany: jest.fn<(...a: any[]) => any>(async () => ({ count: 1 })),
    };
    const prisma = {
      documentTagModel,
      resourceTagModel: {
        count: jest.fn<(...a: any[]) => any>(async () => 2),
      },
      adminActionAuditLogModel,
      $transaction: jest.fn<(...a: any[]) => any>(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(prisma),
      ),
    };
    const service = new TestAdminDocumentService(
      prisma as never,
      {} as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(
      service.tagService.deleteTag(
        `tag-1`,
        `admin-1`,
        { version: updatedAt.getTime(), confirmed: false },
        { idempotencyKey: `x` },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.tagService.deleteTag(
        `tag-1`,
        `admin-1`,
        { version: updatedAt.getTime(), confirmed: true },
        { idempotencyKey: `x` },
      ),
    ).resolves.toEqual({
      tagId: `tag-1`,
      deleted: true,
      affectedResourceCount: 2,
    });

    expect(adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `document_tag_delete`,
          resourceId: `tag-1`,
        }),
      }),
    );
  });

  it(`returns an empty selection for zero tag ids without hitting the repository`, async () => {
    const documentTagModel = {
      findMany: jest.fn<(...a: any[]) => any>(),
    };
    const service = new TestAdminDocumentService(
      {
        documentTagModel,
      } as never,
      {} as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(service.tagService.loadTagSelection([])).resolves.toEqual([]);
    expect(documentTagModel.findMany).not.toHaveBeenCalled();
  });

  it(`rejects partial tag selection lookups`, async () => {
    const service = new TestAdminDocumentService(
      {
        documentTagModel: {
          findMany: jest.fn<(...a: any[]) => any>(async () => [{ id: `tag-1`, name: `evidence` }]),
        },
      } as never,
      {} as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(service.tagService.loadTagSelection([`tag-1`, `tag-2`])).rejects.toBeInstanceOf(NotFoundException);
  });
});
