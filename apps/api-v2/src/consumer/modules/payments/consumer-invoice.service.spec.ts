import { $Enums } from '@remoola/database-2';

import { ConsumerInvoiceService } from './consumer-invoice.service';

describe(`ConsumerInvoiceService`, () => {
  const consumerId = `consumer-1`;
  const consumerEmail = `requester@example.com`;

  it(`allows invoice access for an email-only requester`, async () => {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({ email: consumerEmail }),
      },
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `payment-1`,
          status: $Enums.TransactionStatus.PENDING,
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
            originalName: `INV-PENDING-12345678.pdf`,
          },
        }),
      },
    } as any;

    const service = new ConsumerInvoiceService(prisma, {} as any);
    const result = await service.generateInvoice(`payment-1`, consumerId, `http://localhost:3334`);

    expect(result).toEqual({
      invoiceNumber: `INV-PENDING-12345678`,
      resourceId: `resource-1`,
      downloadUrl: `http://localhost:3334/api/consumer/documents/resource-1/download`,
    });
  });
});
