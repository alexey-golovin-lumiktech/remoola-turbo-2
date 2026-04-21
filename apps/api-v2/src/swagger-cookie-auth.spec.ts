import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

import {
  CONSUMER_ACCESS_TOKEN_COOKIE_KEY,
  getApiAdminCsrfTokenCookieKey,
  getApiConsumerCsrfTokenCookieKey,
} from './shared-common';
import {
  buildSwaggerCookieAuthDescription,
  buildSwaggerCookieAuthDocumentConfig,
  buildSwaggerCookieAuthScript,
  SWAGGER_COOKIE_SECURITY_NAME,
} from './swagger-cookie-auth';

@ApiTags(`Protected`)
@ApiCookieAuth()
@Controller(`protected`)
class ProtectedController {
  @Get()
  getProtected() {
    return { ok: true };
  }
}

describe(`swagger cookie auth helpers`, () => {
  it(`documents the admin cookie-first login flow`, () => {
    const description = buildSwaggerCookieAuthDescription(`admin`, `<a href="/docs/consumer">consumer</a>`);

    expect(description).toContain(`POST /api/admin-v2/auth/login`);
    expect(description).toContain(`POST /api/admin-v2/auth/refresh-access`);
    expect(description).toContain(`authenticated admin mutations`);
    expect(description).toContain(`cookie-first`);
    expect(description).toContain(`Do not use <code>Authorization</code> headers or Basic auth.`);
  });

  it(`documents consumer csrf requirements`, () => {
    const description = buildSwaggerCookieAuthDescription(`consumer`, `<a href="/docs/admin">admin</a>`);

    expect(description).toContain(`POST /api/consumer/auth/login`);
    expect(description).toContain(`x-csrf-token`);
    expect(description).toContain(`logout-all`);
    expect(description).toContain(`authenticated consumer mutations`);
  });

  it(`builds an admin same-origin fetch patch that mirrors admin csrf cookies`, () => {
    const script = buildSwaggerCookieAuthScript(`admin`);

    expect(script).toContain(`window.fetch = function remoolaSwaggerCookieAuthFetch`);
    expect(script).toContain(`credentials = 'include'`);
    expect(script).toContain(getApiAdminCsrfTokenCookieKey());
    expect(script).toContain(`/api/admin/`);
    expect(script).toContain(`protectedPathPrefixes.some`);
    expect(script).toContain(`method.toUpperCase()`);
    expect(script).toContain(`x-csrf-token`);
  });

  it(`builds a consumer same-origin fetch patch that mirrors consumer csrf cookies`, () => {
    const script = buildSwaggerCookieAuthScript(`consumer`);

    expect(script).toContain(getApiConsumerCsrfTokenCookieKey());
    expect(script).toContain(`/api/consumer/`);
    expect(script).toContain(`protectedPathPrefixes.some`);
    expect(script).toContain(`x-csrf-token`);
  });

  it(`adds cookie auth metadata to the generated OpenAPI document`, async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProtectedController],
    }).compile();
    const app = moduleRef.createNestApplication();

    await app.init();

    const document = SwaggerModule.createDocument(
      app,
      buildSwaggerCookieAuthDocumentConfig(`consumer`, `<a href="/docs/admin">admin</a>`),
    );

    expect(document.components?.securitySchemes?.[SWAGGER_COOKIE_SECURITY_NAME]).toMatchObject({
      type: `apiKey`,
      in: `cookie`,
      name: CONSUMER_ACCESS_TOKEN_COOKIE_KEY,
    });
    expect(document.paths[`/protected`]?.get?.security).toEqual([{ [SWAGGER_COOKIE_SECURITY_NAME]: [] }]);

    await app.close();
  });
});
