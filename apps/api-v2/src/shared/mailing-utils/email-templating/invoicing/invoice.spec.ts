import { CURRENCY_CODE } from '@remoola/api-types';

import { processor, type InvoiceForTemplate } from './invoice';
import * as outgoingInvoiceToHtml from './outgoingInvoice';
import { envs } from '../../../../envs';
import { formatCurrency } from '../../../../shared-common';
import { escapeHtml } from '../shared/sanitize';

jest.mock(`../../../../envs`, () => ({
  envs: {
    NODE_ENV: `test`,
    ENVIRONMENT: {
      PRODUCTION: `production`,
      STAGING: `staging`,
      DEVELOPMENT: `development`,
      TEST: `test`,
    },
    CONSUMER_CSS_GRID_APP_ORIGIN: `https://grid.example.com`,
    NEST_APP_EXTERNAL_ORIGIN: `https://api.example.com`,
    PORT: 3334,
  },
}));

describe(`invoice template pay-online origin`, () => {
  const originalEnvs = { ...envs };
  const baseInvoice: InvoiceForTemplate = {
    id: `inv_123`,
    createdAt: `2026-01-01T00:00:00.000Z`,
    dueDateInDays: `2026-01-08T00:00:00.000Z`,
    creator: `creator@example.com`,
    referer: `customer@example.com`,
    total: 12345,
    subtotal: 12000,
    tax: 2.875,
    items: [{ description: `Line item`, amount: 12000 }],
  };

  afterEach(() => {
    Object.assign(envs, originalEnvs);
  });

  it(`uses the canonical consumer app origin when configured`, () => {
    const html = processor(baseInvoice);

    expect(html).toContain(`href="https://grid.example.com/dashboard"`);
  });

  it(`wraps invoice into the common email layout`, () => {
    const html = processor(baseInvoice);

    expect(html).toContain(`data-wirebill-email="root"`);
    expect(html).toContain(`max-width:600px`);
  });

  it(`escapes invoice item descriptions`, () => {
    const html = processor({
      ...baseInvoice,
      items: [{ description: `<img src=x onerror=alert(1)>`, amount: 12000 }],
    });

    expect(html).toContain(`&lt;img src=x onerror=alert(1)&gt;`);
    expect(html).not.toContain(`<img src=x onerror=alert(1)>`);
  });

  it(`renders mobile-friendly stacked invoice item labels`, () => {
    const html = processor(baseInvoice);

    expect(html).toContain(`ITEMS`);
    expect(html).not.toContain(`DESCRIPTION`);
    expect(html).not.toContain(`TAX (%)`);
    expect(html).toContain(`Amount</td>`);
    expect(html).toContain(`Tax</td>`);
    expect(html).toContain(`Subtotal</td>`);
  });

  it(`uses invoice total for outgoing invoice amount due`, () => {
    const html = outgoingInvoiceToHtml.processor(baseInvoice);
    const total = formatCurrency(baseInvoice.total, CURRENCY_CODE.USD);
    const subtotal = formatCurrency(baseInvoice.subtotal, CURRENCY_CODE.USD);

    expect(html).toContain(`Invoice ${baseInvoice.id} • Amount due ${total}`);
    expect(html).toContain(`Amount due`);
    expect(html).toContain(total);
    expect(html).not.toContain(`Invoice ${baseInvoice.id} • Amount due ${subtotal}`);
  });

  it(`builds outgoing invoice payment choices link`, () => {
    const html = outgoingInvoiceToHtml.processor(baseInvoice);

    expect(html).toContain(
      `href="https://api.example.com/api/consumer/payment-choices?invoiceId=inv_123&amp;refererEmail=customer%40example.com"`,
    );
  });

  it(`falls back to localhost in test when the canonical origin is still a placeholder`, () => {
    (envs as any).CONSUMER_CSS_GRID_APP_ORIGIN = `CONSUMER_CSS_GRID_APP_ORIGIN`;

    const html = processor(baseInvoice);

    expect(html).toContain(`href="http://localhost:3003/dashboard"`);
  });

  it(`fails closed in production-like environments when no canonical origin is configured`, () => {
    (envs as any).NODE_ENV = `production`;
    (envs as any).CONSUMER_CSS_GRID_APP_ORIGIN = `CONSUMER_CSS_GRID_APP_ORIGIN`;

    const html = processor(baseInvoice);

    expect(html).toContain(`href="#"`);
  });
});

describe(`email templating escaping`, () => {
  it(`escapes HTML metacharacters`, () => {
    expect(escapeHtml(`<a&"'>`)).toBe(`&lt;a&amp;&quot;&#39;&gt;`);
  });
});
