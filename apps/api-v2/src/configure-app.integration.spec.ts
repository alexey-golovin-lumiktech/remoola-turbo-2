import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Body, Controller, Get, type INestApplication, Post, Req } from '@nestjs/common';
import { type Request } from 'express';
import request from 'supertest';

import { CONSUMER_APP_SCOPE_HEADER, CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { CorrelationIdMiddleware, DeviceIdMiddleware } from './common';
import { OriginResolverService } from './shared/origin-resolver.service';
import { bootstrapApiTestApp } from '../test/helpers/bootstrap-api-test-app';

@Controller(`consumer/webhooks`)
class TestWebhookController {
  @Post()
  receive(@Req() req: Request) {
    const body = req.body as unknown;
    return {
      isBuffer: Buffer.isBuffer(body),
      length: Buffer.isBuffer(body) ? body.length : 0,
    };
  }
}

@Controller(`consumer/configure-app-test`)
class TestConsumerJsonController {
  @Post(`json`)
  echo(@Body() body: { ok?: boolean }) {
    return body;
  }
}

@Controller(`admin-v2/configure-app-test`)
class TestAdminController {
  @Get()
  ok() {
    return { ok: true };
  }
}

describe(`configureApp integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [TestWebhookController, TestConsumerJsonController, TestAdminController],
      providers: [OriginResolverService, CorrelationIdMiddleware, DeviceIdMiddleware],
      preset: `configureApp`,
    });

    app = harness.app;
    close = harness.close;
  });

  afterAll(async () => {
    if (close) {
      await close();
    }
  });

  it(`allows scoped consumer CORS preflight from the current app origin`, async () => {
    await request(app.getHttpServer())
      .options(`/api/consumer/configure-app-test/json`)
      .set(`Origin`, `http://localhost:3003`)
      .expect(204)
      .expect(`Access-Control-Allow-Origin`, `http://localhost:3003`)
      .expect(`Access-Control-Allow-Credentials`, `true`)
      .expect(`Vary`, `Origin`);
  });

  it(`rejects CORS origins outside configured admin and consumer scopes`, async () => {
    await request(app.getHttpServer())
      .options(`/api/admin-v2/configure-app-test`)
      .set(`Origin`, `https://evil.example`)
      .expect(403);
  });

  it(`keeps Stripe-style consumer webhook bodies raw`, async () => {
    await request(app.getHttpServer())
      .post(`/api/consumer/webhooks`)
      .set(`Origin`, `http://localhost:3003`)
      .set(`Content-Type`, `application/json`)
      .send(JSON.stringify({ event: `checkout.session.completed` }))
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({ isBuffer: true, length: 38 });
      });
  });

  it(`parses ordinary consumer JSON routes after webhook raw-body middleware`, async () => {
    await request(app.getHttpServer())
      .post(`/api/consumer/configure-app-test/json`)
      .set(`Origin`, `http://localhost:3003`)
      .set(CONSUMER_APP_SCOPE_HEADER, CURRENT_CONSUMER_APP_SCOPE)
      .send({ ok: true })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({ ok: true });
      });
  });
});
