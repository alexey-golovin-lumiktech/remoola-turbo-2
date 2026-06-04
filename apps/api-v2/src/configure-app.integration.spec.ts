import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Body, Controller, Get, type INestApplication, Post, Req } from '@nestjs/common';
import { Expose, Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { type Request } from 'express';
import request from 'supertest';

import { CONSUMER_APP_SCOPE_HEADER, CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { CorrelationIdMiddleware, DeviceIdMiddleware } from './common';
import { envs } from './envs';
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

@Controller(`consumer/webhook`)
class TestSingularWebhookController {
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

class TestValidationDto {
  @Expose()
  @Type(() => Number)
  @IsInt()
  count!: number;
}

@Controller(`consumer/configure-app-validation`)
class TestValidationController {
  @Post()
  echo(@Body() body: TestValidationDto) {
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
  const initialSwaggerEnabled = envs.SWAGGER_ENABLED;

  beforeAll(async () => {
    envs.SWAGGER_ENABLED = true;
    const harness = await bootstrapApiTestApp({
      controllers: [
        TestWebhookController,
        TestSingularWebhookController,
        TestConsumerJsonController,
        TestValidationController,
        TestAdminController,
      ],
      providers: [OriginResolverService, CorrelationIdMiddleware, DeviceIdMiddleware],
      preset: `configureApp`,
    });

    app = harness.app;
    close = harness.close;
  });

  afterAll(async () => {
    envs.SWAGGER_ENABLED = initialSwaggerEnabled;
    if (close) {
      await close();
    }
  });

  it(`redirects root requests to consumer docs when Swagger is enabled`, async () => {
    envs.SWAGGER_ENABLED = true;

    await request(app.getHttpServer()).get(`/`).expect(302).expect(`Location`, `/docs/consumer`);
    await request(app.getHttpServer()).get(`/api`).expect(302).expect(`Location`, `/docs/consumer`);
  });

  it(`does not redirect root requests when Swagger is disabled`, async () => {
    envs.SWAGGER_ENABLED = false;

    await request(app.getHttpServer()).get(`/`).expect(404);
    await request(app.getHttpServer()).get(`/api`).expect(404);
  });

  it(`allows scoped consumer CORS preflight from the current app origin`, async () => {
    envs.SWAGGER_ENABLED = true;

    await request(app.getHttpServer())
      .options(`/api/consumer/configure-app-test/json`)
      .set(`Origin`, `http://localhost:3003`)
      .expect(204)
      .expect(`Access-Control-Allow-Origin`, `http://localhost:3003`)
      .expect(`Access-Control-Allow-Credentials`, `true`)
      .expect(`Vary`, `Origin`);
  });

  it(`returns the current no-Origin OPTIONS bootstrap headers`, async () => {
    await request(app.getHttpServer())
      .options(`/api/consumer/configure-app-test/json`)
      .expect(204)
      .expect(`Access-Control-Allow-Methods`, `GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS`)
      .expect(`Access-Control-Allow-Credentials`, `true`)
      .expect(`Access-Control-Expose-Headers`, `set-cookie,content-range,content-type`)
      .expect(({ headers }) => {
        expect(headers[`access-control-allow-headers`]).toContain(`Idempotency-Key`);
      });
  });

  it(`applies the current scoped docs/admin and docs/consumer CORS rules`, async () => {
    await request(app.getHttpServer())
      .options(`/docs/admin`)
      .set(`Origin`, `http://localhost:3010`)
      .expect(204)
      .expect(`Access-Control-Allow-Origin`, `http://localhost:3010`);

    await request(app.getHttpServer())
      .options(`/docs/consumer`)
      .set(`Origin`, `http://localhost:3003`)
      .expect(204)
      .expect(`Access-Control-Allow-Origin`, `http://localhost:3003`);
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

  it(`keeps the singular consumer webhook body raw`, async () => {
    await request(app.getHttpServer())
      .post(`/api/consumer/webhook`)
      .set(`Origin`, `http://localhost:3003`)
      .set(`Content-Type`, `application/json`)
      .send(JSON.stringify({ event: `invoice.paid` }))
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({ isBuffer: true, length: 24 });
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

  it(`keeps docs responses on the relaxed Helmet branch and API routes on the default branch`, async () => {
    envs.SWAGGER_ENABLED = true;

    const docsResponse = await request(app.getHttpServer()).get(`/docs/consumer/`).expect(200);
    const apiResponse = await request(app.getHttpServer()).get(`/api/admin-v2/configure-app-test`).expect(200);

    expect(docsResponse.headers[`content-security-policy`]).toBeUndefined();
    expect(apiResponse.headers[`content-security-policy`]).toEqual(expect.any(String));
  });

  it(`uses the global validation pipe for implicit conversion on configured routes`, async () => {
    await request(app.getHttpServer())
      .post(`/api/consumer/configure-app-validation`)
      .set(`Origin`, `http://localhost:3003`)
      .set(CONSUMER_APP_SCOPE_HEADER, CURRENT_CONSUMER_APP_SCOPE)
      .send({ count: `7` })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({ count: 7 });
      });
  });

  it(`rejects invalid payloads through the configured global validation pipe`, async () => {
    await request(app.getHttpServer())
      .post(`/api/consumer/configure-app-validation`)
      .set(`Origin`, `http://localhost:3003`)
      .set(CONSUMER_APP_SCOPE_HEADER, CURRENT_CONSUMER_APP_SCOPE)
      .send({ count: `not-a-number` })
      .expect(400);
  });
});
