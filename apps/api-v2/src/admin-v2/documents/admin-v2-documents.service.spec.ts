import { BadRequestException, ConflictException } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { AdminDocumentTagService } from './admin-document-tag.service';
import { AdminDocumentTaggerService } from './admin-document-tagger.service';
import { AdminDocumentService as AdminDocumentServiceBase } from './admin-document.service';
import { AdminV2DocumentsCommandsRepository } from './admin-v2-documents-commands.repository';
import { AdminV2DocumentsRepository } from './admin-v2-documents.repository';

class TestAdminDocumentService extends AdminDocumentServiceBase {
  readonly tagService: AdminDocumentTagService;
  readonly taggerService: AdminDocumentTaggerService;

  constructor(prisma: any, storage: any, idempotency: any, assignmentsService: any) {
    const documentsQuery = new AdminV2DocumentsRepository(prisma, {
      run: (callback: (tx: unknown) => Promise<unknown>) => prisma.$transaction(callback as never),
    } as never);
    const documentsCommands = new AdminV2DocumentsCommandsRepository(prisma, {
      run: (callback: (tx: unknown) => Promise<unknown>) => prisma.$transaction(callback as never),
    } as never);
    const tagService = new AdminDocumentTagService(idempotency, documentsQuery, documentsCommands);
    const taggerService = new AdminDocumentTaggerService(idempotency, documentsQuery, documentsCommands, tagService);
    super(storage, assignmentsService, documentsQuery);
    this.tagService = tagService;
    this.taggerService = taggerService;
  }
}

function createIdempotency() {
  return {
    execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
  };
}

function createAssignmentsService() {
  return {
    getAssignmentContextForResource: jest.fn(async () => ({ current: null, history: [] })),
    getActiveAssigneesForResource: jest.fn(async () => new Map()),
  };
}

describe(`AdminDocumentService`, () => {
  it(`returns the canonical list contract with singular consumer linkage and linked payment ids`, async () => {
    const service = new TestAdminDocumentService(
      {
        resourceModel: {
          findMany: jest.fn(async () => [
            {
              id: `doc-1`,
              originalName: `proof.pdf`,
              access: `PRIVATE`,
              mimetype: `application/pdf`,
              size: 2048,
              createdAt: new Date(`2026-04-17T08:00:00.000Z`),
              updatedAt: new Date(`2026-04-17T08:10:00.000Z`),
              deletedAt: null,
              consumerResources: [
                {
                  consumer: {
                    id: `consumer-1`,
                    email: `owner@example.com`,
                    deletedAt: null,
                  },
                },
              ],
              resourceTags: [{ tag: { id: `tag-1`, name: `evidence` } }, { tag: { id: `tag-2`, name: `invoice` } }],
              attachments: [
                {
                  paymentRequest: {
                    id: `payment-1`,
                  },
                },
                {
                  paymentRequest: {
                    id: `payment-1`,
                  },
                },
                {
                  paymentRequest: {
                    id: `payment-2`,
                  },
                },
              ],
            },
          ]),
          count: jest.fn(async () => 1),
        },
      } as never,
      {} as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(service.listDocuments()).resolves.toEqual({
      items: [
        {
          id: `doc-1`,
          originalName: `proof.pdf`,
          access: `PRIVATE`,
          mimeType: `application/pdf`,
          size: 2048,
          consumerId: `consumer-1`,
          consumerEmail: `owner@example.com`,
          createdAt: `2026-04-17T08:00:00.000Z`,
          version: new Date(`2026-04-17T08:10:00.000Z`).getTime(),
          tags: [`evidence`, `invoice`],
          linkedPaymentRequestIds: [`payment-1`, `payment-2`],
          assignedTo: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it(`decorates list rows with the active assignee via getActiveAssigneesForResource('document', ids)`, async () => {
    const assignmentsService = createAssignmentsService();
    assignmentsService.getActiveAssigneesForResource.mockResolvedValueOnce(
      new Map([[`doc-1`, { id: `admin-9`, name: null, email: `ops9@example.com` }]]),
    );
    const service = new TestAdminDocumentService(
      {
        resourceModel: {
          findMany: jest.fn(async () => [
            {
              id: `doc-1`,
              originalName: `proof.pdf`,
              access: `PRIVATE`,
              mimetype: `application/pdf`,
              size: 2048,
              createdAt: new Date(`2026-04-17T08:00:00.000Z`),
              updatedAt: new Date(`2026-04-17T08:10:00.000Z`),
              deletedAt: null,
              consumerResources: [],
              resourceTags: [],
              attachments: [],
            },
            {
              id: `doc-2`,
              originalName: `receipt.pdf`,
              access: `PRIVATE`,
              mimetype: `application/pdf`,
              size: 1024,
              createdAt: new Date(`2026-04-17T08:00:00.000Z`),
              updatedAt: new Date(`2026-04-17T08:10:00.000Z`),
              deletedAt: null,
              consumerResources: [],
              resourceTags: [],
              attachments: [],
            },
          ]),
          count: jest.fn(async () => 2),
        },
      } as never,
      {} as never,
      createIdempotency() as never,
      assignmentsService as never,
    );

    const result = await service.listDocuments();

    expect(assignmentsService.getActiveAssigneesForResource).toHaveBeenCalledWith(`document`, [`doc-1`, `doc-2`]);
    expect(result.items[0].assignedTo).toEqual({ id: `admin-9`, name: null, email: `ops9@example.com` });
    expect(result.items[1].assignedTo).toBeNull();
  });

  it(`keeps the canonical singular list contract by degrading ambiguous multi-owner linkage to null`, async () => {
    const service = new TestAdminDocumentService(
      {
        resourceModel: {
          findMany: jest.fn(async () => [
            {
              id: `doc-1`,
              originalName: `proof.pdf`,
              access: `PRIVATE`,
              mimetype: `application/pdf`,
              size: 2048,
              createdAt: new Date(`2026-04-17T08:00:00.000Z`),
              updatedAt: new Date(`2026-04-17T08:10:00.000Z`),
              deletedAt: null,
              consumerResources: [
                {
                  consumer: {
                    id: `consumer-1`,
                    email: `owner-1@example.com`,
                    deletedAt: null,
                  },
                },
                {
                  consumer: {
                    id: `consumer-2`,
                    email: `owner-2@example.com`,
                    deletedAt: null,
                  },
                },
              ],
              resourceTags: [],
              attachments: [],
            },
          ]),
          count: jest.fn(async () => 1),
        },
      } as never,
      {} as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(service.listDocuments()).resolves.toEqual({
      items: [
        {
          id: `doc-1`,
          originalName: `proof.pdf`,
          access: `PRIVATE`,
          mimeType: `application/pdf`,
          size: 2048,
          consumerId: null,
          consumerEmail: null,
          createdAt: `2026-04-17T08:00:00.000Z`,
          version: new Date(`2026-04-17T08:10:00.000Z`).getTime(),
          tags: [],
          linkedPaymentRequestIds: [],
          assignedTo: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it(`returns the canonical case contract with singular consumer linkage`, async () => {
    const service = new TestAdminDocumentService(
      {
        resourceModel: {
          findFirst: jest.fn(async () => ({
            id: `doc-1`,
            originalName: `proof.pdf`,
            access: `PRIVATE`,
            mimetype: `application/pdf`,
            size: 2048,
            createdAt: new Date(`2026-04-17T08:00:00.000Z`),
            updatedAt: new Date(`2026-04-17T08:10:00.000Z`),
            deletedAt: null,
            consumerResources: [
              {
                consumer: {
                  id: `consumer-1`,
                  email: `owner@example.com`,
                  deletedAt: null,
                },
              },
            ],
            resourceTags: [
              {
                tag: {
                  id: `tag-1`,
                  name: `evidence`,
                  createdAt: new Date(`2026-04-17T08:00:00.000Z`),
                  updatedAt: new Date(`2026-04-17T08:05:00.000Z`),
                },
              },
            ],
            attachments: [
              {
                paymentRequest: {
                  id: `payment-1`,
                  amount: new Prisma.Decimal(`42.00`),
                  status: `WAITING`,
                  createdAt: new Date(`2026-04-17T08:05:00.000Z`),
                },
              },
            ],
          })),
        },
      } as never,
      {} as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(service.getDocumentCase(`doc-1`, `https://api.example.com`)).resolves.toEqual({
      id: `doc-1`,
      core: {
        id: `doc-1`,
        originalName: `proof.pdf`,
        access: `PRIVATE`,
        mimeType: `application/pdf`,
        size: 2048,
        createdAt: `2026-04-17T08:00:00.000Z`,
        deletedAt: null,
      },
      consumer: {
        id: `consumer-1`,
        email: `owner@example.com`,
      },
      tags: [
        {
          id: `tag-1`,
          name: `evidence`,
        },
      ],
      linkedPaymentRequests: [
        {
          id: `payment-1`,
          amount: `42`,
          status: `WAITING`,
          createdAt: `2026-04-17T08:05:00.000Z`,
        },
      ],
      downloadUrl: `https://api.example.com/api/admin-v2/documents/doc-1/download`,
      version: new Date(`2026-04-17T08:10:00.000Z`).getTime(),
      updatedAt: `2026-04-17T08:10:00.000Z`,
      staleWarning: false,
      dataFreshnessClass: `exact`,
      assignment: { current: null, history: [] },
    });
  });

  it(`keeps the canonical detail contract by degrading ambiguous multi-owner linkage to null`, async () => {
    const service = new TestAdminDocumentService(
      {
        resourceModel: {
          findFirst: jest.fn(async () => ({
            id: `doc-1`,
            originalName: `proof.pdf`,
            access: `PRIVATE`,
            mimetype: `application/pdf`,
            size: 2048,
            createdAt: new Date(`2026-04-17T08:00:00.000Z`),
            updatedAt: new Date(`2026-04-17T08:10:00.000Z`),
            deletedAt: null,
            consumerResources: [
              {
                consumer: {
                  id: `consumer-1`,
                  email: `owner-1@example.com`,
                  deletedAt: null,
                },
              },
              {
                consumer: {
                  id: `consumer-2`,
                  email: `owner-2@example.com`,
                  deletedAt: null,
                },
              },
            ],
            resourceTags: [],
            attachments: [],
          })),
        },
      } as never,
      {} as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(service.getDocumentCase(`doc-1`, `https://api.example.com`)).resolves.toEqual({
      id: `doc-1`,
      core: {
        id: `doc-1`,
        originalName: `proof.pdf`,
        access: `PRIVATE`,
        mimeType: `application/pdf`,
        size: 2048,
        createdAt: `2026-04-17T08:00:00.000Z`,
        deletedAt: null,
      },
      consumer: null,
      tags: [],
      linkedPaymentRequests: [],
      downloadUrl: `https://api.example.com/api/admin-v2/documents/doc-1/download`,
      version: new Date(`2026-04-17T08:10:00.000Z`).getTime(),
      updatedAt: `2026-04-17T08:10:00.000Z`,
      staleWarning: false,
      dataFreshnessClass: `exact`,
      assignment: { current: null, history: [] },
    });
  });

  it(`fetches operational assignment context for the document case via the shared helper`, async () => {
    const assignedAt = new Date(`2026-04-18T09:00:00.000Z`);
    const assignmentsService = createAssignmentsService();
    assignmentsService.getAssignmentContextForResource.mockResolvedValueOnce({
      current: {
        id: `assignment-doc-1`,
        assignedTo: { id: `admin-1`, name: null, email: `ops@example.com` },
        assignedBy: { id: `admin-1`, name: null, email: `ops@example.com` },
        assignedAt: assignedAt.toISOString(),
        reason: `Reviewing supporting evidence`,
        expiresAt: null,
      },
      history: [
        {
          id: `assignment-doc-1`,
          assignedTo: { id: `admin-1`, name: null, email: `ops@example.com` },
          assignedBy: { id: `admin-1`, name: null, email: `ops@example.com` },
          assignedAt: assignedAt.toISOString(),
          releasedAt: null,
          releasedBy: null,
          reason: `Reviewing supporting evidence`,
          expiresAt: null,
        },
      ],
    });
    const service = new TestAdminDocumentService(
      {
        resourceModel: {
          findFirst: jest.fn(async () => ({
            id: `doc-with-assignment`,
            originalName: `evidence.pdf`,
            access: `PRIVATE`,
            mimetype: `application/pdf`,
            size: 1024,
            createdAt: new Date(`2026-04-17T08:00:00.000Z`),
            updatedAt: new Date(`2026-04-17T08:10:00.000Z`),
            deletedAt: null,
            consumerResources: [],
            resourceTags: [],
            attachments: [],
          })),
        },
      } as never,
      {} as never,
      createIdempotency() as never,
      assignmentsService as never,
    );

    const documentCase = await service.getDocumentCase(`doc-with-assignment`);

    expect(assignmentsService.getAssignmentContextForResource).toHaveBeenCalledWith(`document`, `doc-with-assignment`);
    expect(documentCase.assignment.current).toEqual(
      expect.objectContaining({
        id: `assignment-doc-1`,
        assignedTo: expect.objectContaining({ id: `admin-1`, email: `ops@example.com` }),
        reason: `Reviewing supporting evidence`,
      }),
    );
    expect(documentCase.assignment.history).toHaveLength(1);
  });

  it(`returns exact tag usage stats and marks reserved invoice tags as read-only`, async () => {
    const service = new TestAdminDocumentService(
      {
        documentTagModel: {
          findMany: jest.fn(async () => [
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
      create: jest.fn(async () => ({ id: `audit-1` })),
    };
    const documentTagModel = {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => ({
        id: `tag-1`,
        name: `evidence`,
        updatedAt: new Date(`2026-04-17T09:00:00.000Z`),
      })),
    };
    const prisma = {
      documentTagModel,
      adminActionAuditLogModel,
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
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
      findUnique: jest.fn(async () => ({
        id: `tag-1`,
        name: `evidence`,
        updatedAt: new Date(`2026-04-17T09:00:00.000Z`),
      })),
      create: jest.fn(),
    };
    const adminActionAuditLogModel = {
      create: jest.fn(),
    };
    const prisma = {
      documentTagModel,
      adminActionAuditLogModel,
      $transaction: jest.fn(),
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
      create: jest.fn(async () => ({ id: `audit-1` })),
    };
    const documentTagModel = {
      findUnique: jest
        .fn()
        .mockResolvedValueOnce({
          id: `tag-1`,
          name: `evidence`,
          updatedAt: originalUpdatedAt,
        })
        .mockResolvedValueOnce(null),
      updateMany: jest.fn(async () => ({ count: 1 })),
      findUniqueOrThrow: jest.fn(async () => ({
        id: `tag-1`,
        name: `verified`,
        updatedAt: nextUpdatedAt,
      })),
    };
    const prisma = {
      documentTagModel,
      adminActionAuditLogModel,
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
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
      findUnique: jest.fn().mockResolvedValueOnce(tag).mockResolvedValueOnce(tag),
      updateMany: jest.fn(),
    };
    const adminActionAuditLogModel = {
      create: jest.fn(),
    };
    const prisma = {
      documentTagModel,
      adminActionAuditLogModel,
      $transaction: jest.fn(),
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
      create: jest.fn(async () => ({ id: `audit-1` })),
    };
    const documentTagModel = {
      findUnique: jest.fn(async () => ({
        id: `tag-1`,
        name: `evidence`,
        updatedAt,
      })),
      deleteMany: jest.fn(async () => ({ count: 1 })),
    };
    const prisma = {
      documentTagModel,
      resourceTagModel: {
        count: jest.fn(async () => 2),
      },
      adminActionAuditLogModel,
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
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

  it(`blocks reserved invoice tags from retagging and records document_retag otherwise`, async () => {
    const updatedAt = new Date(`2026-04-17T12:00:00.000Z`);
    const nextUpdatedAt = new Date(`2026-04-17T12:05:00.000Z`);
    const adminActionAuditLogModel = {
      create: jest.fn(async () => ({ id: `audit-1` })),
    };
    const resourceModel = {
      findFirst: jest.fn(async () => ({
        id: `doc-1`,
        updatedAt,
        deletedAt: null,
        resourceTags: [{ tag: { id: `tag-0`, name: `old-tag` } }],
      })),
      updateMany: jest.fn(async () => ({ count: 1 })),
      findUnique: jest.fn(async () => ({ updatedAt: nextUpdatedAt })),
      findUniqueOrThrow: jest.fn(async () => ({ updatedAt: nextUpdatedAt })),
    };
    const prisma = {
      resourceModel,
      documentTagModel: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: `tag-reserved`, name: `INVOICE-PENDING` }])
          .mockResolvedValueOnce([{ id: `tag-1`, name: `evidence` }]),
      },
      resourceTagModel: {
        deleteMany: jest.fn(async () => ({ count: 1 })),
        createMany: jest.fn(async () => ({ count: 1 })),
      },
      adminActionAuditLogModel,
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
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
      create: jest.fn(async () => ({ id: `audit-1` })),
    };
    const resourceModel = {
      findFirst: jest.fn(async () => ({
        id: `doc-1`,
        updatedAt,
        deletedAt: null,
        resourceTags: [{ tag: { id: `tag-0`, name: `old-tag` } }],
      })),
      updateMany: jest.fn(async () => ({ count: 1 })),
      findUniqueOrThrow: jest.fn(async () => ({ updatedAt: nextUpdatedAt })),
    };
    const createMany = jest.fn(async () => ({ count: 0 }));
    const prisma = {
      resourceModel,
      documentTagModel: {
        findMany: jest.fn(),
      },
      resourceTagModel: {
        deleteMany: jest.fn(async () => ({ count: 1 })),
        createMany,
      },
      adminActionAuditLogModel,
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
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
      create: jest.fn(async () => ({ id: `audit-1` })),
    };
    const resourceModel = {
      findMany: jest.fn(async () => [
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
      updateMany: jest.fn(async () => ({ count: 1 })),
    };
    const prisma = {
      documentTagModel: {
        findMany: jest.fn(async () => [{ id: `tag-1`, name: `evidence` }]),
      },
      resourceModel,
      resourceTagModel: {
        createMany: jest.fn(async () => ({ count: 2 })),
      },
      adminActionAuditLogModel,
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
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
      create: jest.fn(async () => ({ id: `audit-1` })),
    };
    const resourceModel = {
      findMany: jest.fn(async () => [
        {
          id: `doc-1`,
          updatedAt,
          deletedAt: null,
        },
      ]),
      updateMany: jest.fn(async () => ({ count: 1 })),
    };
    const resourceTagModel = {
      createMany: jest.fn(async () => ({ count: 0 })),
    };
    const prisma = {
      documentTagModel: {
        findMany: jest.fn(async () => [{ id: `tag-1`, name: `evidence` }]),
      },
      resourceModel,
      resourceTagModel,
      adminActionAuditLogModel,
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
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

  it(`opens secure downloads only through the evidence-scoped resource lookup`, async () => {
    const storage = {
      openDownloadStream: jest.fn(async () => ({ stream: `stream`, filename: `proof.pdf` })),
    };
    const resourceModel = {
      findFirst: jest.fn(async () => ({
        bucket: `local`,
        key: `consumer-1/proof.pdf`,
        originalName: `proof.pdf`,
        mimetype: `application/pdf`,
      })),
    };
    const service = new TestAdminDocumentService(
      {
        resourceModel,
      } as never,
      storage as never,
      createIdempotency() as never,
      createAssignmentsService() as never,
    );

    await expect(service.openDownload(`doc-1`)).resolves.toEqual({ stream: `stream`, filename: `proof.pdf` });
    expect(resourceModel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: `doc-1`,
        }),
      }),
    );
    expect(storage.openDownloadStream).toHaveBeenCalledWith({
      bucket: `local`,
      key: `consumer-1/proof.pdf`,
      originalName: `proof.pdf`,
      mimetype: `application/pdf`,
    });
  });
});
