import { describe, expect, it, jest } from '@jest/globals';

import { Prisma } from '@remoola/database-2';

import { createAssignmentsService, createIdempotency, TestAdminDocumentService } from './admin-documents.test-helpers';

describe(`AdminDocumentService`, () => {
  it(`returns the canonical list contract with singular consumer linkage and linked payment ids`, async () => {
    const service = new TestAdminDocumentService(
      {
        resourceModel: {
          findMany: jest.fn<(...a: any[]) => any>(async () => [
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
          count: jest.fn<(...a: any[]) => any>(async () => 1),
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
          findMany: jest.fn<(...a: any[]) => any>(async () => [
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
          count: jest.fn<(...a: any[]) => any>(async () => 2),
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
          findMany: jest.fn<(...a: any[]) => any>(async () => [
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
          count: jest.fn<(...a: any[]) => any>(async () => 1),
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
          findFirst: jest.fn<(...a: any[]) => any>(async () => ({
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
          findFirst: jest.fn<(...a: any[]) => any>(async () => ({
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
          findFirst: jest.fn<(...a: any[]) => any>(async () => ({
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

  it(`opens secure downloads only through the evidence-scoped resource lookup`, async () => {
    const storage = {
      openDownloadStream: jest.fn<(...a: any[]) => any>(async () => ({ stream: `stream`, filename: `proof.pdf` })),
    };
    const resourceModel = {
      findFirst: jest.fn<(...a: any[]) => any>(async () => ({
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
