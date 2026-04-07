import { processor, type InvoiceForTemplate } from './invoice';
import { envs } from '../../../../envs';

jest.mock(`../../../../envs`, () => ({
  envs: {
    NODE_ENV: `test`,
    ENVIRONMENT: {
      PRODUCTION: `production`,
      STAGING: `staging`,
      DEVELOPMENT: `development`,
      TEST: `test`,
    },
    CONSUMER_APP_ORIGIN: `https://consumer.example.com`,
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

    expect(html).toContain(`href="https://consumer.example.com/dashboard"`);
  });

  it(`falls back to localhost in test when the canonical origin is still a placeholder`, () => {
    (envs as any).CONSUMER_APP_ORIGIN = `CONSUMER_APP_ORIGIN`;

    const html = processor(baseInvoice);

    expect(html).toContain(`href="http://localhost:3001/dashboard"`);
  });

  it(`fails closed in production-like environments when no canonical origin is configured`, () => {
    (envs as any).NODE_ENV = `production`;
    (envs as any).CONSUMER_APP_ORIGIN = `CONSUMER_APP_ORIGIN`;

    const html = processor(baseInvoice);

    expect(html).toContain(`href="#"`);
  });
});
