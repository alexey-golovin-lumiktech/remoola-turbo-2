import { $Enums } from '@remoola/database-2';

import { ConsumerInvoiceService } from './consumer-invoice.service';

describe(`ConsumerInvoiceService`, () => {
  const consumerId = `consumer-1`;
  const consumerEmail = `requester@example.com`;

  it(`reuses an existing invoice without exposing the raw waiting-recipient-approval status`, async () => {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({ email: consumerEmail }),
      },
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `payment-1`,
          status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
          payerId: `payer-1`,
          payerEmail: `payer@example.com`,
          requesterId: null,
          requesterEmail: `REQUESTER@example.com`,
          payer: null,
          requester: null,
          ledgerEntries: [],
        }),
      },
      paymentRequestAttachmentModel: {
        findFirst: jest.fn().mockResolvedValue({
          resource: {
            id: `resource-1`,
            originalName: `INV-WAITING-12345678.pdf`,
          },
        }),
      },
    } as any;

    const service = new ConsumerInvoiceService(prisma, {} as any);
    const result = await service.generateInvoice(`payment-1`, consumerId, `http://localhost:3334`);

    expect(result).toEqual({
      invoiceNumber: `INV-WAITING-12345678`,
      resourceId: `resource-1`,
      downloadUrl: `http://localhost:3334/api/consumer/documents/resource-1/download`,
    });
  });

  it(`creates a fresh invoice with normalized waiting tag and invoice number`, async () => {
    const now = 1_712_345_678_901;
    const paymentId = `abcdef12-raw-status`;
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({ email: consumerEmail }),
      },
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: paymentId,
          amount: `100.00`,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
          createdAt: new Date(`2026-03-29T12:00:00.000Z`),
          payerId: `payer-1`,
          payerEmail: `payer@example.com`,
          payer: null,
          requesterId: consumerId,
          requesterEmail: consumerEmail,
          requester: null,
          ledgerEntries: [],
        }),
      },
      paymentRequestAttachmentModel: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: `attachment-1` }),
      },
      resourceModel: {
        create: jest.fn().mockResolvedValue({
          id: `resource-2`,
          downloadUrl: `legacy://unused`,
        }),
      },
      consumerResourceModel: {
        create: jest.fn().mockResolvedValue({ id: `consumer-resource-1` }),
      },
    } as any;
    const storage = {
      upload: jest.fn().mockResolvedValue({
        bucket: `local`,
        key: `invoices/test.pdf`,
        downloadUrl: `legacy://unused`,
      }),
    } as any;
    const service = new ConsumerInvoiceService(prisma, storage);
    const renderPdfFromHtml = jest.spyOn(service as any, `renderPdfFromHtml`).mockResolvedValue(Buffer.from(`pdf`));
    const dateNow = jest.spyOn(Date, `now`).mockReturnValue(now);

    try {
      const result = await service.generateInvoice(paymentId, consumerId, `http://localhost:3334`);

      expect(result).toEqual({
        invoiceNumber: `INV-WAITING-abcdef12-${now}`,
        resourceId: `resource-2`,
        downloadUrl: `http://localhost:3334/api/consumer/documents/resource-2/download`,
      });
      expect(storage.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: `INV-WAITING-abcdef12-${now}.pdf`,
        }),
        `http://localhost:3334`,
      );
      expect(prisma.resourceModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resourceTags: {
            create: {
              tag: {
                connectOrCreate: {
                  where: { name: `INVOICE-WAITING` },
                  create: { name: `INVOICE-WAITING` },
                },
              },
            },
          },
        }),
      });
      expect(renderPdfFromHtml).toHaveBeenCalled();
    } finally {
      dateNow.mockRestore();
    }
  });
});
