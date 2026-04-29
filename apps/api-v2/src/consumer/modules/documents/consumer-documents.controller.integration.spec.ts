import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { ConsumerDocumentsController } from './consumer-documents.controller';
import { ConsumerDocumentsService } from './consumer-documents.service';
import { bootstrapApiTestApp } from '../../../../test/helpers/bootstrap-api-test-app';
import { withConsumerAppScope } from '../../../../test/helpers/http-test-helpers';

describe(`ConsumerDocumentsController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  const consumerIdentity = {
    id: `00000000-0000-4000-8000-000000000211`,
    email: `consumer-boundary@local.test`,
    type: `CONSUMER`,
  };

  const bulkDeleteDocuments = jest.fn(async () => ({ success: true }));
  const attachToPayment = jest.fn(async () => ({ success: true }));
  const setTags = jest.fn(async () => ({ success: true }));
  const service = {
    getDocuments: jest.fn(),
    openDownload: jest.fn(),
    uploadDocuments: jest.fn(),
    bulkDeleteDocuments,
    deleteDocument: jest.fn(),
    attachToPayment,
    detachFromPayment: jest.fn(),
    setTags,
  };

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [ConsumerDocumentsController],
      providers: [{ provide: ConsumerDocumentsService, useValue: service }],
      preset: `validationOnly`,
      identity: consumerIdentity,
      cookieSecret: `test-secret`,
    });

    app = harness.app;
    close = harness.close;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    bulkDeleteDocuments.mockImplementation(async () => ({ success: true }));
    attachToPayment.mockImplementation(async () => ({ success: true }));
    setTags.mockImplementation(async () => ({ success: true }));
  });

  afterAll(async () => {
    if (close) {
      await close();
    }
  });

  it(`POST /api/consumer/documents/bulk-delete accepts documentIds arrays`, async () => {
    await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/documents/bulk-delete`))
      .send({
        documentIds: [`resource-1`],
      })
      .expect(201, { success: true });

    expect(service.bulkDeleteDocuments as jest.Mock).toHaveBeenCalledWith(consumerIdentity.id, [`resource-1`]);
  });

  it(`POST /api/consumer/documents/attach-to-payment accepts resourceIds arrays`, async () => {
    await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/documents/attach-to-payment`))
      .send({
        paymentRequestId: `payment-1`,
        resourceIds: [`resource-1`],
      })
      .expect(201, { success: true });

    expect(service.attachToPayment as jest.Mock).toHaveBeenCalledWith(consumerIdentity.id, `payment-1`, [`resource-1`]);
  });

  it(`POST /api/consumer/documents/:id/tags accepts string arrays for tags`, async () => {
    await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/documents/resource-1/tags`))
      .send({
        tags: [`Urgent`, ` Client `],
      })
      .expect(201, { success: true });

    expect(service.setTags as jest.Mock).toHaveBeenCalledWith(consumerIdentity.id, `resource-1`, [
      `Urgent`,
      ` Client `,
    ]);
  });
});
