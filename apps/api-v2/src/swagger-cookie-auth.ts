import { DocumentBuilder } from '@nestjs/swagger';

import {
  ADMIN_ACCESS_TOKEN_COOKIE_KEY,
  CONSUMER_ACCESS_TOKEN_COOKIE_KEY,
  getApiAdminCsrfTokenCookieKey,
  getApiConsumerCsrfTokenCookieKey,
} from './shared-common';

export const SWAGGER_COOKIE_SECURITY_NAME = `cookie`;
const SWAGGER_ADMIN_COOKIE_NAME = ADMIN_ACCESS_TOKEN_COOKIE_KEY;
const SWAGGER_CONSUMER_COOKIE_NAME = CONSUMER_ACCESS_TOKEN_COOKIE_KEY;
type SwaggerCookieAuthAudience = `admin` | `consumer`;

const SWAGGER_MUTATION_METHODS = [`POST`, `PUT`, `PATCH`, `DELETE`] as const;
const SWAGGER_CSRF_COOKIE_KEYS_BY_AUDIENCE: Record<SwaggerCookieAuthAudience, readonly string[]> = {
  admin: [getApiAdminCsrfTokenCookieKey()],
  consumer: [getApiConsumerCsrfTokenCookieKey()],
};
const SWAGGER_PROTECTED_PATH_PREFIXES_BY_AUDIENCE: Record<SwaggerCookieAuthAudience, readonly string[]> = {
  admin: [`/api/admin/`],
  consumer: [`/api/consumer/`],
};

export const swaggerCookieAuthCustomCss = `
.swagger-ui .remoola-cookie-auth-note {
  margin: 16px 0 24px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.04);
}
.swagger-ui .remoola-cookie-auth-note h3 {
  margin: 0 0 8px;
  font-size: 16px;
}
.swagger-ui .remoola-cookie-auth-note p,
.swagger-ui .remoola-cookie-auth-note li {
  font-size: 13px;
  line-height: 1.5;
}
.swagger-ui .remoola-cookie-auth-note ol,
.swagger-ui .remoola-cookie-auth-note ul {
  margin: 8px 0 0 18px;
}
`;

export function buildSwaggerCookieAuthDescription(audience: `admin` | `consumer`, linkedDocsHtml: string): string {
  if (audience === `admin`) {
    return [
      `Admin API ${linkedDocsHtml}`,
      `<div class="remoola-cookie-auth-note">`,
      `<h3>Cookie session workflow</h3>`,
      `<p>This Swagger page is cookie-first. Do not use <code>Authorization</code> headers or Basic auth.</p>`,
      `<ol>`,
      `<li>Run <code>POST /api/admin-v2/auth/login</code> with JSON body credentials.</li>`,
      `<li>Your browser stores the returned auth and CSRF cookies on this API origin.</li>`,
      `<li>Use <strong>Try it out</strong> on protected endpoints from the same docs page; ` +
        `cookies are reused automatically.</li>`,
      `</ol>`,
      `<p>Admin auth endpoints such as <code>POST /api/admin-v2/auth/refresh-access</code> and ` +
        `<code>/logout</code>, plus authenticated admin mutations, require CSRF parity. Swagger auto-mirrors ` +
        `the readable admin CSRF cookie into <code>x-csrf-token</code> for those same-origin mutation requests.</p>`,
      `<p>For logout testing, call <code>POST /api/admin-v2/auth/logout</code>. ` +
        `The repo runbook lives in <code>docs/SWAGGER_COOKIE_AUTH_USAGE.md</code>.</p>`,
      `</div>`,
    ].join(``);
  }

  return [
    `Consumer API ${linkedDocsHtml}`,
    `<div class="remoola-cookie-auth-note">`,
    `<h3>Cookie session workflow</h3>`,
    `<p>This Swagger page is cookie-first. Do not use <code>Authorization</code> headers or Basic auth.</p>`,
    `<ol>`,
    `<li>Run <code>POST /api/consumer/auth/login</code> with JSON body credentials.</li>`,
    `<li>Your browser stores access, refresh, and CSRF cookies on this API origin.</li>`,
    `<li>Use <strong>Try it out</strong> on protected endpoints from the same docs page; ` +
      `same-origin requests reuse those cookies automatically.</li>`,
    `</ol>`,
    `<p>Consumer auth mutations such as <code>/api/consumer/auth/refresh</code>, ` +
      `<code>/logout</code>, and <code>/logout-all</code>, plus authenticated consumer mutations, require ` +
      `CSRF parity. Swagger auto-mirrors the readable consumer CSRF cookie into <code>x-csrf-token</code> ` +
      `for those same-origin mutation requests.</p>`,
    `<p>Login and refresh stay cookie-first: auth tokens are not returned in the JSON response body.</p>`,
    `<p>The repo runbook lives in <code>docs/SWAGGER_COOKIE_AUTH_USAGE.md</code>.</p>`,
    `</div>`,
  ].join(``);
}

export function buildSwaggerCookieAuthDocumentConfig(audience: `admin` | `consumer`, linkedDocsHtml: string) {
  const builder = new DocumentBuilder()
    .setTitle(audience === `admin` ? `Remoola Admin API` : `Remoola Consumer API`)
    .setDescription(buildSwaggerCookieAuthDescription(audience, linkedDocsHtml))
    .setVersion(`1.0`);

  builder.addCookieAuth(
    audience === `admin` ? SWAGGER_ADMIN_COOKIE_NAME : SWAGGER_CONSUMER_COOKIE_NAME,
    undefined,
    SWAGGER_COOKIE_SECURITY_NAME,
  );

  return builder.build();
}

export function buildSwaggerCookieAuthScript(audience: SwaggerCookieAuthAudience): string {
  const csrfCookieKeys = SWAGGER_CSRF_COOKIE_KEYS_BY_AUDIENCE[audience];
  const protectedPathPrefixes = SWAGGER_PROTECTED_PATH_PREFIXES_BY_AUDIENCE[audience];

  return `
(function () {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  if (window.__remoolaSwaggerCookieAuthPatched) return;
  window.__remoolaSwaggerCookieAuthPatched = true;

  const csrfCookieKeys = ${JSON.stringify(csrfCookieKeys)};
  const mutationMethods = new Set(${JSON.stringify(SWAGGER_MUTATION_METHODS)});
  const protectedPathPrefixes = ${JSON.stringify(protectedPathPrefixes)};
  const originalFetch = window.fetch.bind(window);

  function getCookieValue(names) {
    const parts = document.cookie ? document.cookie.split(/;\\s*/) : [];
    for (const name of names) {
      const prefix = name + '=';
      for (const part of parts) {
        if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length));
      }
    }
    return null;
  }

  function toAbsoluteUrl(input) {
    try {
      if (typeof input === 'string') return new URL(input, window.location.origin);
      if (input instanceof URL) return input;
      if (input && typeof input.url === 'string') return new URL(input.url, window.location.origin);
    } catch {}
    return null;
  }

  function getRequestMethod(input, init) {
    const method = init && typeof init.method === 'string'
      ? init.method
      : input instanceof Request && typeof input.method === 'string'
        ? input.method
        : 'GET';
    return method.toUpperCase();
  }

  function requiresCsrf(method, pathname) {
    return mutationMethods.has(method) && protectedPathPrefixes.some((prefix) => pathname.startsWith(prefix));
  }

  window.fetch = function remoolaSwaggerCookieAuthFetch(input, init) {
    const absoluteUrl = toAbsoluteUrl(input);
    if (!absoluteUrl) {
      return originalFetch(input, init);
    }

    const nextInit = init ? { ...init } : {};
    const sameOrigin = absoluteUrl.origin === window.location.origin;

    if (sameOrigin) {
      nextInit.credentials = 'include';
    }

    if (sameOrigin && requiresCsrf(getRequestMethod(input, init), absoluteUrl.pathname)) {
      const csrfToken = getCookieValue(csrfCookieKeys);
      if (csrfToken) {
        const mergedHeaders = new Headers(input instanceof Request ? input.headers : undefined);
        if (nextInit.headers) {
          new Headers(nextInit.headers).forEach((value, key) => mergedHeaders.set(key, value));
        }
        if (!mergedHeaders.has('x-csrf-token')) {
          mergedHeaders.set('x-csrf-token', csrfToken);
        }
        nextInit.headers = mergedHeaders;
      }
    }

    return originalFetch(input, nextInit);
  };
})();
`.trim();
}
