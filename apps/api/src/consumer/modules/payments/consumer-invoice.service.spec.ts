import { $Enums } from '@remoola/database-2';

import { buildConsumerInvoiceMetadata } from './consumer-invoice.service';

describe(`buildConsumerInvoiceMetadata`, () => {
  it(`collapses WAITING_RECIPIENT_APPROVAL to WAITING for consumer-facing invoice output`, () => {
    const metadata = buildConsumerInvoiceMetadata({
      paymentId: `12345678-90ab-cdef-1234-567890abcdef`,
      status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
      timestamp: 1_700_000_000_000,
    });

    expect(metadata.consumerFacingStatus).toBe($Enums.TransactionStatus.WAITING);
    expect(metadata.invoiceNumber).toBe(`INV-WAITING-12345678-1700000000000`);
    expect(metadata.resourceTagName).toBe(`INVOICE-WAITING`);
  });
});
