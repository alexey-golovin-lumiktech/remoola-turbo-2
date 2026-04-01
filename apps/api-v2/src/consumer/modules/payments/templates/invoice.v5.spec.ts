import { buildInvoiceHtmlV5 } from './invoice.v5';
import { type InvoicePayment } from './types';

/** Minimal payment shape for template tests. Template defensively handles null payer/requester. */
function minimalPayment(overrides: Partial<{ payer: null; requester: null; ledgerEntries: unknown[] }> = {}) {
  return {
    id: `pr-test-123`,
    amount: `100.00`,
    currencyCode: `USD`,
    status: `PENDING`,
    createdAt: new Date().toISOString(),
    payerId: null,
    requesterId: null,
    payerEmail: `payer@example.com`,
    payer: null,
    requester: null,
    ledgerEntries: [],
    ...overrides,
  } as unknown as InvoicePayment;
}

describe(`buildInvoiceHtmlV5`, () => {
  it(`does not throw when payer and requester are null (e.g. email-only recipient)`, () => {
    const html = buildInvoiceHtmlV5({
      invoiceNumber: `INV-001`,
      payment: minimalPayment(),
    });
    expect(html).toContain(`Billed To`);
    expect(html).toContain(`Requester`);
    expect(html).toContain(`—`); // fallback when requester is null
  });

  it(`shows payerEmail in Billed To when payer is null`, () => {
    const html = buildInvoiceHtmlV5({
      invoiceNumber: `INV-002`,
      payment: minimalPayment(),
    });
    expect(html).toContain(`payer@example.com`);
  });

  it(`renders amount and currency`, () => {
    const html = buildInvoiceHtmlV5({
      invoiceNumber: `INV-003`,
      payment: minimalPayment(),
    });
    expect(html).toContain(`100.00`);
    expect(html).toContain(`USD`);
  });
});
