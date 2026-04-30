import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerDocumentsService } from './consumer-documents.service';

describe(`ConsumerDocumentsService.attachToPayment`, () => {
  const consumerId = `consumer-1`;
  const paymentRequestId = `payment-1`;

  function makeService() {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({ email: `owner@example.com` }),
      },
      paymentRequestModel: {
        findFirst: jest.fn(),
      },
      consumerResourceModel: {
        findMany: jest.fn(),
      },
      paymentRequestAttachmentModel: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    } as any;

    const service = new ConsumerDocumentsService(prisma, {} as any);
    return { service, prisma };
  }

  it(`attaches only missing accessible documents to requester draft`, async () => {
    const { service, prisma } = makeService();

    prisma.paymentRequestModel.findFirst.mockResolvedValue({
      id: paymentRequestId,
      status: $Enums.TransactionStatus.DRAFT,
    });
    prisma.consumerResourceModel.findMany.mockResolvedValue([{ resourceId: `doc-1` }]);
    prisma.paymentRequestAttachmentModel.findMany
      .mockResolvedValueOnce([{ resourceId: `doc-2` }])
      .mockResolvedValueOnce([{ resourceId: `doc-2` }]);

    const result = await service.attachToPayment(consumerId, paymentRequestId, [` doc-1 `, `doc-2`, `doc-2`]);

    expect(result).toEqual({ success: true });
    expect(prisma.consumerResourceModel.findMany).toHaveBeenCalledWith({
      where: {
        consumerId,
        resourceId: { in: [`doc-1`, `doc-2`] },
        deletedAt: null,
        resource: {
          deletedAt: null,
        },
      },
      select: { resourceId: true },
    });
    expect(prisma.paymentRequestAttachmentModel.createMany).toHaveBeenCalledWith({
      data: [{ paymentRequestId, requesterId: consumerId, resourceId: `doc-1` }],
      skipDuplicates: true,
    });
  });

  it(`rejects when payment request does not belong to requester`, async () => {
    const { service, prisma } = makeService();
    prisma.paymentRequestModel.findFirst.mockResolvedValue(null);

    await expect(service.attachToPayment(consumerId, paymentRequestId, [`doc-1`])).rejects.toThrow(ForbiddenException);
    await expect(service.attachToPayment(consumerId, paymentRequestId, [`doc-1`])).rejects.toThrow(
      errorCodes.PAYMENT_NOT_OWNED,
    );
  });

  it(`rejects when payment request is no longer a draft`, async () => {
    const { service, prisma } = makeService();
    prisma.paymentRequestModel.findFirst.mockResolvedValue({
      id: paymentRequestId,
      status: $Enums.TransactionStatus.PENDING,
    });

    await expect(service.attachToPayment(consumerId, paymentRequestId, [`doc-1`])).rejects.toThrow(BadRequestException);
    expect(prisma.consumerResourceModel.findMany).not.toHaveBeenCalled();
    expect(prisma.paymentRequestAttachmentModel.createMany).not.toHaveBeenCalled();
  });

  it(`rejects inaccessible resource ids`, async () => {
    const { service, prisma } = makeService();

    prisma.paymentRequestModel.findFirst.mockResolvedValue({
      id: paymentRequestId,
      status: $Enums.TransactionStatus.DRAFT,
    });
    prisma.consumerResourceModel.findMany.mockResolvedValue([{ resourceId: `doc-1` }]);
    prisma.paymentRequestAttachmentModel.findMany.mockResolvedValue([]);

    await expect(service.attachToPayment(consumerId, paymentRequestId, [`doc-1`, `doc-2`])).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.attachToPayment(consumerId, paymentRequestId, [`doc-1`, `doc-2`])).rejects.toThrow(
      errorCodes.DOCUMENT_ACCESS_DENIED,
    );
    expect(prisma.paymentRequestAttachmentModel.createMany).not.toHaveBeenCalled();
  });

  it(`allows reusing relationship files that are already attached to another in-scope payment`, async () => {
    const { service, prisma } = makeService();

    prisma.paymentRequestModel.findFirst.mockResolvedValue({
      id: paymentRequestId,
      status: $Enums.TransactionStatus.DRAFT,
    });
    prisma.consumerResourceModel.findMany.mockResolvedValue([]);
    prisma.paymentRequestAttachmentModel.findMany
      .mockResolvedValueOnce([{ resourceId: `shared-doc-1` }])
      .mockResolvedValueOnce([]);

    await expect(service.attachToPayment(consumerId, paymentRequestId, [`shared-doc-1`])).resolves.toEqual({
      success: true,
    });

    expect(prisma.paymentRequestAttachmentModel.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        deletedAt: null,
        resource: {
          deletedAt: null,
        },
        resourceId: { in: [`shared-doc-1`] },
        paymentRequest: {
          deletedAt: null,
          OR: [
            { requesterId: consumerId },
            { payerId: consumerId },
            { requesterId: null, requesterEmail: { equals: `owner@example.com`, mode: `insensitive` } },
            { payerId: null, payerEmail: { equals: `owner@example.com`, mode: `insensitive` } },
          ],
        },
      },
      select: { resourceId: true },
    });
    expect(prisma.paymentRequestAttachmentModel.createMany).toHaveBeenCalledWith({
      data: [{ paymentRequestId, requesterId: consumerId, resourceId: `shared-doc-1` }],
      skipDuplicates: true,
    });
  });
});

describe(`ConsumerDocumentsService.bulkDeleteDocuments`, () => {
  const consumerId = `consumer-1`;

  function makeService() {
    const prisma = {
      paymentRequestAttachmentModel: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      consumerResourceModel: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      resourceTagModel: {
        deleteMany: jest.fn(),
      },
    } as any;

    const service = new ConsumerDocumentsService(prisma, {} as any);
    return { service, prisma };
  }

  it(`blocks deletion when a document is still attached to a draft payment request`, async () => {
    const { service, prisma } = makeService();

    prisma.consumerResourceModel.findMany.mockResolvedValue([{ resourceId: `resource-1` }]);
    prisma.paymentRequestAttachmentModel.findMany.mockResolvedValue([
      {
        resourceId: `resource-1`,
        paymentRequest: { status: $Enums.TransactionStatus.DRAFT },
      },
    ]);

    await expect(service.bulkDeleteDocuments(consumerId, [` resource-1 `])).rejects.toThrow(BadRequestException);
    await expect(service.bulkDeleteDocuments(consumerId, [` resource-1 `])).rejects.toThrow(
      `This document is still attached to a draft payment request. ` +
        `Remove it from the draft before deleting it from Documents.`,
    );

    expect(prisma.paymentRequestAttachmentModel.findMany).toHaveBeenCalledWith({
      where: {
        resourceId: { in: [`resource-1`] },
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
    expect(prisma.consumerResourceModel.deleteMany).not.toHaveBeenCalled();
    expect(prisma.resourceTagModel.deleteMany).not.toHaveBeenCalled();
    expect(prisma.paymentRequestAttachmentModel.deleteMany).not.toHaveBeenCalled();
  });

  it(`blocks deletion when a document is attached to a non-draft payment request`, async () => {
    const { service, prisma } = makeService();

    prisma.consumerResourceModel.findMany.mockResolvedValue([{ resourceId: `resource-1` }]);
    prisma.paymentRequestAttachmentModel.findMany.mockResolvedValue([
      {
        resourceId: `resource-1`,
        paymentRequest: { status: $Enums.TransactionStatus.COMPLETED },
      },
    ]);

    await expect(service.bulkDeleteDocuments(consumerId, [`resource-1`])).rejects.toThrow(BadRequestException);
    await expect(service.bulkDeleteDocuments(consumerId, [`resource-1`])).rejects.toThrow(
      `This document is attached to a non-draft payment request and cannot be deleted from Documents.`,
    );

    expect(prisma.consumerResourceModel.deleteMany).not.toHaveBeenCalled();
    expect(prisma.resourceTagModel.deleteMany).not.toHaveBeenCalled();
    expect(prisma.paymentRequestAttachmentModel.deleteMany).not.toHaveBeenCalled();
  });

  it(`rejects foreign resource ids before deleting tags or ownership links`, async () => {
    const { service, prisma } = makeService();

    prisma.consumerResourceModel.findMany.mockResolvedValue([{ resourceId: `resource-1` }]);

    await expect(service.bulkDeleteDocuments(consumerId, [`resource-1`, `resource-2`])).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.bulkDeleteDocuments(consumerId, [`resource-1`, `resource-2`])).rejects.toThrow(
      errorCodes.DOCUMENT_ACCESS_DENIED,
    );

    expect(prisma.paymentRequestAttachmentModel.findMany).not.toHaveBeenCalled();
    expect(prisma.consumerResourceModel.deleteMany).not.toHaveBeenCalled();
    expect(prisma.resourceTagModel.deleteMany).not.toHaveBeenCalled();
  });

  it(`deletes when the selected documents are not attached to any payment request`, async () => {
    const { service, prisma } = makeService();

    prisma.consumerResourceModel.findMany.mockResolvedValue([
      { resourceId: `resource-1` },
      { resourceId: `resource-2` },
    ]);
    prisma.paymentRequestAttachmentModel.findMany.mockResolvedValue([]);
    prisma.consumerResourceModel.deleteMany.mockResolvedValue({ count: 1 });
    prisma.resourceTagModel.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      service.bulkDeleteDocuments(consumerId, [` resource-1 `, `resource-1`, `resource-2`]),
    ).resolves.toEqual({
      success: true,
    });

    expect(prisma.consumerResourceModel.deleteMany).toHaveBeenCalledWith({
      where: {
        consumerId,
        resourceId: { in: [`resource-1`, `resource-2`] },
      },
    });
    expect(prisma.resourceTagModel.deleteMany).toHaveBeenCalledWith({
      where: {
        resourceId: { in: [`resource-1`, `resource-2`] },
      },
    });
    expect(prisma.paymentRequestAttachmentModel.deleteMany).not.toHaveBeenCalled();
  });
});

describe(`ConsumerDocumentsService.detachFromPayment`, () => {
  const consumerId = `consumer-1`;
  const paymentRequestId = `payment-1`;

  function makeService() {
    const prisma = {
      paymentRequestModel: {
        findFirst: jest.fn(),
      },
      paymentRequestAttachmentModel: {
        deleteMany: jest.fn(),
      },
    } as any;

    const service = new ConsumerDocumentsService(prisma, {} as any);
    return { service, prisma };
  }

  it(`removes only the payment-request attachment link for requester draft`, async () => {
    const { service, prisma } = makeService();

    prisma.paymentRequestModel.findFirst.mockResolvedValue({
      id: paymentRequestId,
      status: $Enums.TransactionStatus.DRAFT,
    });
    prisma.paymentRequestAttachmentModel.deleteMany.mockResolvedValue({ count: 1 });

    const result = await service.detachFromPayment(consumerId, paymentRequestId, ` resource-1 `);

    expect(result).toEqual({ success: true });
    expect(prisma.paymentRequestAttachmentModel.deleteMany).toHaveBeenCalledWith({
      where: {
        paymentRequestId,
        requesterId: consumerId,
        resourceId: `resource-1`,
      },
    });
  });

  it(`stays idempotent when the attachment link is already absent`, async () => {
    const { service, prisma } = makeService();

    prisma.paymentRequestModel.findFirst.mockResolvedValue({
      id: paymentRequestId,
      status: $Enums.TransactionStatus.DRAFT,
    });
    prisma.paymentRequestAttachmentModel.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.detachFromPayment(consumerId, paymentRequestId, `resource-1`)).resolves.toEqual({
      success: true,
    });
  });

  it(`rejects blank resource ids`, async () => {
    const { service, prisma } = makeService();

    await expect(service.detachFromPayment(consumerId, paymentRequestId, `  `)).rejects.toThrow(BadRequestException);
    expect(prisma.paymentRequestModel.findFirst).not.toHaveBeenCalled();
    expect(prisma.paymentRequestAttachmentModel.deleteMany).not.toHaveBeenCalled();
  });
});

describe(`ConsumerDocumentsService.uploadDocuments`, () => {
  const consumerId = `consumer-1`;
  const paymentRequestId = `payment-1`;

  function makeUploadService() {
    const prisma = {
      paymentRequestModel: {
        findFirst: jest.fn(),
      },
      resourceModel: {
        create: jest.fn(),
      },
      consumerResourceModel: {
        create: jest.fn(),
      },
      paymentRequestAttachmentModel: {
        create: jest.fn(),
      },
    } as any;
    const storage = {
      upload: jest.fn(),
    } as any;

    const service = new ConsumerDocumentsService(prisma, storage);
    return { service, prisma, storage };
  }

  it(`uploads documents directly into requester draft attachments`, async () => {
    const { service, prisma, storage } = makeUploadService();

    prisma.paymentRequestModel.findFirst.mockResolvedValue({
      id: paymentRequestId,
      status: $Enums.TransactionStatus.DRAFT,
    });
    storage.upload.mockResolvedValue({
      bucket: `documents`,
      key: `file-key`,
      downloadUrl: `https://files.example/doc.pdf`,
    });
    prisma.resourceModel.create.mockResolvedValue({
      id: `resource-1`,
    });

    const result = await service.uploadDocuments(
      consumerId,
      [
        {
          originalname: `contract.pdf`,
          mimetype: `application/pdf`,
          size: 1234,
          buffer: Buffer.from(`file`),
        } as Express.Multer.File,
      ],
      `http://localhost:3334`,
      paymentRequestId,
    );

    expect(result).toEqual({ ids: [`resource-1`] });
    expect(prisma.resourceModel.create).toHaveBeenCalledWith({
      data: {
        access: $Enums.ResourceAccess.PRIVATE,
        originalName: `contract.pdf`,
        mimetype: `application/pdf`,
        size: 1234,
        bucket: `documents`,
        key: `file-key`,
        downloadUrl: `https://files.example/doc.pdf`,
      },
    });
    expect(prisma.paymentRequestAttachmentModel.create).toHaveBeenCalledWith({
      data: {
        paymentRequestId,
        requesterId: consumerId,
        resourceId: `resource-1`,
      },
    });
  });

  it(`rejects direct draft upload when payment request is not requester-owned draft`, async () => {
    const { service, prisma, storage } = makeUploadService();

    prisma.paymentRequestModel.findFirst.mockResolvedValue({
      id: paymentRequestId,
      status: $Enums.TransactionStatus.PENDING,
    });

    await expect(
      service.uploadDocuments(
        consumerId,
        [
          {
            originalname: `contract.pdf`,
            mimetype: `application/pdf`,
            size: 1234,
            buffer: Buffer.from(`file`),
          } as Express.Multer.File,
        ],
        `http://localhost:3334`,
        paymentRequestId,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(storage.upload).not.toHaveBeenCalled();
    expect(prisma.resourceModel.create).not.toHaveBeenCalled();
    expect(prisma.paymentRequestAttachmentModel.create).not.toHaveBeenCalled();
  });
});

describe(`ConsumerDocumentsService.getDocuments`, () => {
  const consumerId = `consumer-1`;

  function makeService() {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({ email: `owner@example.com` }),
      },
      contactModel: {
        findFirst: jest.fn(),
      },
      consumerResourceModel: {
        findMany: jest.fn(),
      },
      paymentRequestAttachmentModel: {
        findMany: jest.fn(),
      },
    } as any;

    const service = new ConsumerDocumentsService(prisma, {} as any);
    return { service, prisma };
  }

  it(`exposes separate draft and non-draft payment attachment truth per resource`, async () => {
    const { service, prisma } = makeService();
    const createdAt = new Date(`2026-03-27T10:00:00.000Z`);
    const resource = {
      id: `resource-1`,
      originalName: `invoice.pdf`,
      size: 2048,
      createdAt,
      downloadUrl: `https://files.example/invoice.pdf`,
      mimetype: `application/pdf`,
      resourceTags: [{ tag: { name: `invoice` } }],
    };

    prisma.consumerResourceModel.findMany.mockResolvedValue([
      {
        resource,
        createdAt,
      },
    ]);
    prisma.paymentRequestAttachmentModel.findMany.mockResolvedValue([
      {
        resource,
        createdAt,
        paymentRequest: {
          id: `payment-draft`,
          status: $Enums.TransactionStatus.DRAFT,
        },
      },
      {
        resource,
        createdAt: new Date(`2026-03-27T11:00:00.000Z`),
        paymentRequest: {
          id: `payment-sent`,
          status: $Enums.TransactionStatus.PENDING,
        },
      },
    ]);

    await expect(service.getDocuments(consumerId, undefined, 1, 10, `http://localhost:3334`)).resolves.toEqual({
      items: [
        {
          id: `resource-1`,
          name: `invoice.pdf`,
          size: 2048,
          createdAt: createdAt.toISOString(),
          downloadUrl: `http://localhost:3334/api/consumer/documents/resource-1/download`,
          mimetype: `application/pdf`,
          kind: `PAYMENT`,
          tags: [`invoice`],
          isAttachedToDraftPaymentRequest: true,
          attachedDraftPaymentRequestIds: [`payment-draft`],
          isAttachedToNonDraftPaymentRequest: true,
          attachedNonDraftPaymentRequestIds: [`payment-sent`],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it(`filters to contract-scoped relationship files when contactId is provided`, async () => {
    const { service, prisma } = makeService();
    const createdAt = new Date(`2026-03-27T10:00:00.000Z`);
    const resource = {
      id: `resource-1`,
      originalName: `invoice.pdf`,
      size: 2048,
      createdAt,
      downloadUrl: `https://files.example/invoice.pdf`,
      mimetype: `application/pdf`,
      resourceTags: [{ tag: { name: `invoice` } }],
    };

    prisma.contactModel.findFirst.mockResolvedValue({
      id: `contact-1`,
      email: `vendor@example.com`,
    });
    prisma.paymentRequestAttachmentModel.findMany.mockResolvedValue([
      {
        resource,
        createdAt,
        paymentRequest: {
          id: `payment-draft`,
          status: $Enums.TransactionStatus.DRAFT,
        },
      },
    ]);

    await expect(
      service.getDocuments(consumerId, undefined, 1, 10, `http://localhost:3334`, `contact-1`),
    ).resolves.toEqual({
      items: [
        {
          id: `resource-1`,
          name: `invoice.pdf`,
          size: 2048,
          createdAt: createdAt.toISOString(),
          downloadUrl: `http://localhost:3334/api/consumer/documents/resource-1/download`,
          mimetype: `application/pdf`,
          kind: `PAYMENT`,
          tags: [`invoice`],
          isAttachedToDraftPaymentRequest: true,
          attachedDraftPaymentRequestIds: [`payment-draft`],
          isAttachedToNonDraftPaymentRequest: false,
          attachedNonDraftPaymentRequestIds: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    expect(prisma.contactModel.findFirst).toHaveBeenCalledWith({
      where: {
        id: `contact-1`,
        consumerId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
      },
    });
    expect(prisma.consumerResourceModel.findMany).not.toHaveBeenCalled();
    expect(prisma.paymentRequestAttachmentModel.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        resource: {
          deletedAt: null,
        },
        paymentRequest: {
          AND: [
            { deletedAt: null },
            {
              OR: [
                { requesterId: consumerId },
                { payerId: consumerId },
                { requesterId: null, requesterEmail: { equals: `owner@example.com`, mode: `insensitive` } },
                { payerId: null, payerEmail: { equals: `owner@example.com`, mode: `insensitive` } },
              ],
            },
            {
              OR: [
                { payer: { email: { equals: `vendor@example.com`, mode: `insensitive` } } },
                { requester: { email: { equals: `vendor@example.com`, mode: `insensitive` } } },
                { payerEmail: { equals: `vendor@example.com`, mode: `insensitive` } },
                { requesterEmail: { equals: `vendor@example.com`, mode: `insensitive` } },
              ],
            },
          ],
        },
      },
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
  });

  it(`ignores soft-deleted relationship attachments in document listings`, async () => {
    const { service, prisma } = makeService();

    prisma.consumerResourceModel.findMany.mockResolvedValue([]);
    prisma.paymentRequestAttachmentModel.findMany.mockResolvedValue([]);

    await service.getDocuments(consumerId, undefined, 1, 10, `http://localhost:3334`);

    expect(prisma.paymentRequestAttachmentModel.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        resource: {
          deletedAt: null,
        },
        paymentRequest: {
          deletedAt: null,
          OR: [
            { requesterId: consumerId },
            { payerId: consumerId },
            { requesterId: null, requesterEmail: { equals: `owner@example.com`, mode: `insensitive` } },
            { payerId: null, payerEmail: { equals: `owner@example.com`, mode: `insensitive` } },
          ],
        },
      },
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
  });

  it(`falls back to the ORM listing when Prisma raw queries fail`, async () => {
    const createdAt = new Date(`2026-03-27T10:00:00.000Z`);
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(`Raw query failed`, {
          code: `P2010`,
          clientVersion: `6.x`,
        }),
      ),
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({ email: `owner@example.com` }),
      },
      contactModel: {
        findFirst: jest.fn(),
      },
      consumerResourceModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            resource: {
              id: `resource-1`,
              originalName: `contract.pdf`,
              size: 2048,
              createdAt,
              mimetype: `application/pdf`,
              resourceTags: [],
            },
            createdAt,
          },
        ]),
      },
      paymentRequestAttachmentModel: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;

    const service = new ConsumerDocumentsService(prisma, {} as any);

    await expect(service.getDocuments(consumerId, undefined, 1, 10, `http://localhost:3334`)).resolves.toEqual({
      items: [
        {
          id: `resource-1`,
          name: `contract.pdf`,
          size: 2048,
          createdAt: createdAt.toISOString(),
          downloadUrl: `http://localhost:3334/api/consumer/documents/resource-1/download`,
          mimetype: `application/pdf`,
          kind: `CONTRACT`,
          tags: [],
          isAttachedToDraftPaymentRequest: false,
          attachedDraftPaymentRequestIds: [],
          isAttachedToNonDraftPaymentRequest: false,
          attachedNonDraftPaymentRequestIds: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.consumerResourceModel.findMany).toHaveBeenCalled();
    expect(prisma.paymentRequestAttachmentModel.findMany).toHaveBeenCalled();
  });
});

describe(`ConsumerDocumentsService.openDownload`, () => {
  const consumerId = `consumer-1`;

  function makeService() {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn(),
      },
      resourceModel: {
        findFirst: jest.fn(),
      },
    } as any;
    const storage = {
      openDownloadStream: jest.fn(),
    } as any;

    const service = new ConsumerDocumentsService(prisma, storage);
    return { service, prisma, storage };
  }

  it(`opens a stream for an owned resource`, async () => {
    const { service, prisma, storage } = makeService();
    const streamResult = {
      stream: { pipe: jest.fn() },
      filename: `invoice.pdf`,
      contentType: `application/pdf`,
      contentLength: 42,
    };

    prisma.consumerModel.findUnique.mockResolvedValue({ email: `owner@example.com` });
    prisma.resourceModel.findFirst.mockResolvedValue({
      bucket: `local`,
      key: `docs/invoice.pdf`,
      originalName: `invoice.pdf`,
      mimetype: `application/pdf`,
    });
    storage.openDownloadStream.mockResolvedValue(streamResult);

    await expect(service.openDownload(consumerId, `resource-1`)).resolves.toBe(streamResult);
    expect(prisma.resourceModel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: `resource-1`,
          deletedAt: null,
          OR: expect.arrayContaining([
            {
              consumerResources: {
                some: {
                  consumerId,
                  deletedAt: null,
                },
              },
            },
          ]),
        }),
        select: {
          bucket: true,
          key: true,
          originalName: true,
          mimetype: true,
        },
      }),
    );
    expect(storage.openDownloadStream).toHaveBeenCalledWith({
      bucket: `local`,
      key: `docs/invoice.pdf`,
      originalName: `invoice.pdf`,
      mimetype: `application/pdf`,
    });
  });

  it(`rejects when the consumer does not have access to the resource`, async () => {
    const { service, prisma, storage } = makeService();

    prisma.consumerModel.findUnique.mockResolvedValue({ email: `owner@example.com` });
    prisma.resourceModel.findFirst.mockResolvedValue(null);

    await expect(service.openDownload(consumerId, `resource-2`)).rejects.toThrow(ForbiddenException);
    expect(storage.openDownloadStream).not.toHaveBeenCalled();
  });
});
