import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';

import { createAssignmentsService, createIdempotency, TestAdminDocumentService } from './admin-documents.test-helpers';

describe(`AdminDocumentTaggerService`, () => {
  it(`blocks reserved invoice tags from retagging and records document_retag otherwise`, async () => {
    const updatedAt = new Date(`2026-04-17T12:00:00.000Z`);
    const nextUpdatedAt = new Date(`2026-04-17T12:05:00.000Z`);
    const adminActionAuditLogModel = {
      create: jest.fn<(...a: any[]) => any>(async () => ({ id: `audit-1` })),
    };
    const resourceModel = {
      findFirst: jest.fn<(...a: any[]) => any>(async () => ({
        id: `doc-1`,
        updatedAt,
        deletedAt: null,
        resourceTags: [{ tag: { id: `tag-0`, name: `old-tag` } }],
      })),
      updateMany: jest.fn<(...a: any[]) => any>(async () => ({ count: 1 })),
      findUnique: jest.fn<(...a: any[]) => any>(async () => ({ updatedAt: nextUpdatedAt })),
      findUniqueOrThrow: jest.fn<(...a: any[]) => any>(async () => ({ updatedAt: nextUpdatedAt })),
    };
    const prisma = {
      resourceModel,
      documentTagModel: {
        findMany: jest
          .fn<(...a: any[]) => any>()
          .mockResolvedValueOnce([{ id: `tag-reserved`, name: `INVOICE-PENDING` }])
          .mockResolvedValueOnce([{ id: `tag-1`, name: `evidence` }]),
      },
      resourceTagModel: {
        deleteMany: jest.fn<(...a: any[]) => any>(async () => ({ count: 1 })),
        createMany: jest.fn<(...a: any[]) => any>(async () => ({ count: 1 })),
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
      service.taggerService.retagDocument(
        `doc-1`,
        `admin-1`,
        { version: updatedAt.getTime(), tagIds: [`tag-reserved`] },
        { idempotencyKey: `idem-1` },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.taggerService.retagDocument(
        `doc-1`,
        `admin-1`,
        { version: updatedAt.getTime(), tagIds: [`tag-1`] },
        { idempotencyKey: `idem-2` },
      ),
    ).resolves.toEqual({
      resourceId: `doc-1`,
      tagIds: [`tag-1`],
      version: nextUpdatedAt.getTime(),
      updatedAt: `2026-04-17T12:05:00.000Z`,
    });

    expect(adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `document_retag`,
          resource: `document`,
          resourceId: `doc-1`,
        }),
      }),
    );
  });

  it(`allows retagging a document down to zero tags`, async () => {
    const updatedAt = new Date(`2026-04-17T12:00:00.000Z`);
    const nextUpdatedAt = new Date(`2026-04-17T12:05:00.000Z`);
    const adminActionAuditLogModel = {
      create: jest.fn<(...a: any[]) => any>(async () => ({ id: `audit-1` })),
    };
    const resourceModel = {
      findFirst: jest.fn<(...a: any[]) => any>(async () => ({
        id: `doc-1`,
        updatedAt,
        deletedAt: null,
        resourceTags: [{ tag: { id: `tag-0`, name: `old-tag` } }],
      })),
      updateMany: jest.fn<(...a: any[]) => any>(async () => ({ count: 1 })),
      findUniqueOrThrow: jest.fn<(...a: any[]) => any>(async () => ({ updatedAt: nextUpdatedAt })),
    };
    const createMany = jest.fn<(...a: any[]) => any>(async () => ({ count: 0 }));
    const prisma = {
      resourceModel,
      documentTagModel: {
        findMany: jest.fn<(...a: any[]) => any>(),
      },
      resourceTagModel: {
        deleteMany: jest.fn<(...a: any[]) => any>(async () => ({ count: 1 })),
        createMany,
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
      service.taggerService.retagDocument(
        `doc-1`,
        `admin-1`,
        { version: updatedAt.getTime(), tagIds: [] },
        { idempotencyKey: `idem-3` },
      ),
    ).resolves.toEqual({
      resourceId: `doc-1`,
      tagIds: [],
      version: nextUpdatedAt.getTime(),
      updatedAt: `2026-04-17T12:05:00.000Z`,
    });

    expect(createMany).not.toHaveBeenCalled();
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

  it(`records document_bulk_tag and touches every selected document version`, async () => {
    const updatedAt1 = new Date(`2026-04-17T13:00:00.000Z`);
    const updatedAt2 = new Date(`2026-04-17T13:10:00.000Z`);
    const adminActionAuditLogModel = {
      create: jest.fn<(...a: any[]) => any>(async () => ({ id: `audit-1` })),
    };
    const resourceModel = {
      findMany: jest.fn<(...a: any[]) => any>(async () => [
        {
          id: `doc-1`,
          updatedAt: updatedAt1,
          deletedAt: null,
        },
        {
          id: `doc-2`,
          updatedAt: updatedAt2,
          deletedAt: null,
        },
      ]),
      updateMany: jest.fn<(...a: any[]) => any>(async () => ({ count: 1 })),
    };
    const prisma = {
      documentTagModel: {
        findMany: jest.fn<(...a: any[]) => any>(async () => [{ id: `tag-1`, name: `evidence` }]),
      },
      resourceModel,
      resourceTagModel: {
        createMany: jest.fn<(...a: any[]) => any>(async () => ({ count: 2 })),
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
      service.taggerService.bulkTagDocuments(
        `admin-1`,
        {
          tagIds: [`tag-1`],
          resources: [
            { resourceId: `doc-1`, version: updatedAt1.getTime() },
            { resourceId: `doc-2`, version: updatedAt2.getTime() },
          ],
        },
        { idempotencyKey: `idem-3` },
      ),
    ).resolves.toEqual({
      targetCount: 2,
      tagCount: 1,
      associationsCreated: 2,
    });

    expect(resourceModel.updateMany).toHaveBeenCalledTimes(2);
    expect(adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `document_bulk_tag`,
          resource: `document_batch`,
        }),
      }),
    );
  });

  it(`returns zero created associations when bulk tagging only duplicates`, async () => {
    const updatedAt = new Date(`2026-04-17T13:00:00.000Z`);
    const adminActionAuditLogModel = {
      create: jest.fn<(...a: any[]) => any>(async () => ({ id: `audit-1` })),
    };
    const resourceModel = {
      findMany: jest.fn<(...a: any[]) => any>(async () => [
        {
          id: `doc-1`,
          updatedAt,
          deletedAt: null,
        },
      ]),
      updateMany: jest.fn<(...a: any[]) => any>(async () => ({ count: 1 })),
    };
    const resourceTagModel = {
      createMany: jest.fn<(...a: any[]) => any>(async () => ({ count: 0 })),
    };
    const prisma = {
      documentTagModel: {
        findMany: jest.fn<(...a: any[]) => any>(async () => [{ id: `tag-1`, name: `evidence` }]),
      },
      resourceModel,
      resourceTagModel,
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
      service.taggerService.bulkTagDocuments(
        `admin-1`,
        {
          tagIds: [`tag-1`],
          resources: [{ resourceId: `doc-1`, version: updatedAt.getTime() }],
        },
        { idempotencyKey: `idem-4` },
      ),
    ).resolves.toEqual({
      targetCount: 1,
      tagCount: 1,
      associationsCreated: 0,
    });

    expect(resourceTagModel.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
      }),
    );
    expect(adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `document_bulk_tag`,
          metadata: expect.objectContaining({
            associationsCreated: 0,
          }),
        }),
      }),
    );
  });
});
