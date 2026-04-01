import { Injectable } from '@nestjs/common';

import { envs } from '../envs';

type HeaderValue = string | string[] | undefined;

@Injectable()
export class OriginResolverService {
  private readonly defaultOriginPlaceholder = `CONSUMER_APP_ORIGIN`;
  private readonly adminOriginPlaceholder = `ADMIN_APP_ORIGIN`;
  private readonly localDevAllowedPorts = new Set([`3003`, `3010`]);

  normalizeOrigin(origin: string): string {
    return origin.replace(/\/$/, ``);
  }

  private isValidOrigin(origin: string | undefined, placeholder: string): boolean {
    return !!origin && origin !== placeholder;
  }

  private isDevOrTestEnv(): boolean {
    return envs.NODE_ENV === envs.ENVIRONMENT.DEVELOPMENT || envs.NODE_ENV === envs.ENVIRONMENT.TEST;
  }

  private isLoopbackHost(hostname: string): boolean {
    return hostname === `localhost` || hostname === `127.0.0.1` || hostname === `[::1]` || hostname === `::1`;
  }

  private isAllowedLocalDevOrigin(origin: URL): boolean {
    if (!this.isDevOrTestEnv()) return false;
    if (!this.isLoopbackHost(origin.hostname)) return false;
    return this.localDevAllowedPorts.has(origin.port);
  }

  private getFirstHeaderValue(value: HeaderValue): string | undefined {
    if (Array.isArray(value)) {
      return value.find((entry): entry is string => typeof entry === `string` && entry.trim().length > 0)?.trim();
    }

    return typeof value === `string` && value.trim().length > 0 ? value.trim() : undefined;
  }

  getAllowedOrigins(): Set<string> {
    const origins = new Set<string>();

    if (this.isValidOrigin(envs.CONSUMER_APP_ORIGIN, this.defaultOriginPlaceholder)) {
      origins.add(this.normalizeOrigin(envs.CONSUMER_APP_ORIGIN));
    }

    if (this.isValidOrigin(envs.ADMIN_APP_ORIGIN, this.adminOriginPlaceholder)) {
      origins.add(this.normalizeOrigin(envs.ADMIN_APP_ORIGIN));
    }

    if (Array.isArray(envs.CORS_ALLOWED_ORIGINS)) {
      for (const origin of envs.CORS_ALLOWED_ORIGINS) {
        if (origin) origins.add(this.normalizeOrigin(origin));
      }
    }

    return origins;
  }

  validateReturnOrigin(returnOrigin?: string): string | undefined {
    if (!returnOrigin) return undefined;

    try {
      const url = new URL(returnOrigin);
      const normalized = this.normalizeOrigin(url.origin);

      if (this.getAllowedOrigins().has(normalized)) {
        return normalized;
      }

      // Keep local OAuth redirects stable during development/test even when
      // CORS_ALLOWED_ORIGINS is narrowed by env overrides.
      if (this.isAllowedLocalDevOrigin(url)) {
        return normalized;
      }
    } catch {
      // ignore invalid url
    }

    return undefined;
  }

  resolveRequestOrigin(requestOrigin?: HeaderValue, requestReferer?: HeaderValue): string | undefined {
    const originHeader = this.getFirstHeaderValue(requestOrigin);
    if (originHeader) {
      const validatedOrigin = this.validateReturnOrigin(originHeader);
      if (validatedOrigin) return validatedOrigin;
    }

    const refererHeader = this.getFirstHeaderValue(requestReferer);
    if (refererHeader) {
      return this.validateReturnOrigin(refererHeader);
    }

    return undefined;
  }

  resolveConsumerOrigin(returnOrigin?: string): string | null {
    const validatedReturnOrigin = this.validateReturnOrigin(returnOrigin);
    if (validatedReturnOrigin) {
      return validatedReturnOrigin;
    }

    if (this.isValidOrigin(envs.CONSUMER_APP_ORIGIN, this.defaultOriginPlaceholder)) {
      return envs.CONSUMER_APP_ORIGIN;
    }

    return envs.CORS_ALLOWED_ORIGINS?.[0] ?? null;
  }

  resolveConsumerOriginFromRequest(
    returnOrigin?: string,
    requestOrigin?: HeaderValue,
    requestReferer?: HeaderValue,
  ): string | null {
    return (
      this.validateReturnOrigin(returnOrigin) ??
      this.resolveRequestOrigin(requestOrigin, requestReferer) ??
      this.resolveConsumerOrigin()
    );
  }
}
