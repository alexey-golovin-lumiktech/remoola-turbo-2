import { Injectable } from '@nestjs/common';

import {
  CONSUMER_APP_SCOPES,
  isConsumerAppScope as isKnownConsumerAppScope,
  type ConsumerAppScope,
} from '@remoola/api-types';

import { envs } from '../envs';

type HeaderValue = string | string[] | undefined;

@Injectable()
export class OriginResolverService {
  private readonly defaultOriginPlaceholder = `CONSUMER_APP_ORIGIN`;
  private readonly mobileOriginPlaceholder = `CONSUMER_MOBILE_APP_ORIGIN`;
  private readonly cssGridOriginPlaceholder = `CONSUMER_CSS_GRID_APP_ORIGIN`;
  private readonly adminOriginPlaceholder = `ADMIN_APP_ORIGIN`;
  private readonly consumerLocalDevOriginScopes = new Map<string, ConsumerAppScope>([
    [`3001`, `consumer`],
    [`3002`, `consumer-mobile`],
    [`3003`, `consumer-css-grid`],
    [`3333`, `consumer`],
  ]);
  private readonly adminLocalDevAllowedPorts = new Set([`3010`]);

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

  private resolveLocalDevConsumerScope(origin: URL): ConsumerAppScope | undefined {
    if (!this.isDevOrTestEnv()) return undefined;
    if (!this.isLoopbackHost(origin.hostname)) return undefined;
    return this.consumerLocalDevOriginScopes.get(origin.port);
  }

  private isAllowedLocalDevOrigin(origin: URL, scope: `consumer` | `admin` | `all`): boolean {
    if (!this.isDevOrTestEnv()) return false;
    if (!this.isLoopbackHost(origin.hostname)) return false;
    const allowedPorts =
      scope === `admin`
        ? this.adminLocalDevAllowedPorts
        : scope === `consumer`
          ? new Set(this.consumerLocalDevOriginScopes.keys())
          : new Set([...this.consumerLocalDevOriginScopes.keys(), ...this.adminLocalDevAllowedPorts]);
    return allowedPorts.has(origin.port);
  }

  private getConfiguredConsumerOriginsByScope(): Map<ConsumerAppScope, string> {
    const origins = new Map<ConsumerAppScope, string>();

    if (this.isValidOrigin(envs.CONSUMER_APP_ORIGIN, this.defaultOriginPlaceholder)) {
      origins.set(`consumer`, this.normalizeOrigin(envs.CONSUMER_APP_ORIGIN));
    }

    if (this.isValidOrigin(envs.CONSUMER_MOBILE_APP_ORIGIN, this.mobileOriginPlaceholder)) {
      origins.set(`consumer-mobile`, this.normalizeOrigin(envs.CONSUMER_MOBILE_APP_ORIGIN));
    }

    if (this.isValidOrigin(envs.CONSUMER_CSS_GRID_APP_ORIGIN, this.cssGridOriginPlaceholder)) {
      origins.set(`consumer-css-grid`, this.normalizeOrigin(envs.CONSUMER_CSS_GRID_APP_ORIGIN));
    }

    return origins;
  }

  private getConfiguredConsumerOriginScopes(): Map<string, ConsumerAppScope> {
    const scopes = new Map<string, ConsumerAppScope>();
    for (const [scope, origin] of this.getConfiguredConsumerOriginsByScope()) {
      scopes.set(origin, scope);
    }
    return scopes;
  }

  private getConfiguredCorsAllowedOrigins(): Set<string> {
    const origins = new Set<string>();
    for (const candidate of envs.CORS_ALLOWED_ORIGINS ?? []) {
      try {
        origins.add(this.normalizeOrigin(new URL(candidate).origin));
      } catch {
        // ignore invalid configured origin values
      }
    }
    return origins;
  }

  private getFirstHeaderValue(headerValue: HeaderValue): string | undefined {
    if (Array.isArray(headerValue)) {
      return headerValue.find((entry): entry is string => typeof entry === `string` && entry.trim().length > 0)?.trim();
    }

    return typeof headerValue === `string` && headerValue.trim().length > 0 ? headerValue.trim() : undefined;
  }

  getConsumerAllowedOrigins(): Set<string> {
    return new Set([...this.getConfiguredConsumerOriginScopes().keys(), ...this.getConfiguredCorsAllowedOrigins()]);
  }

  getAdminAllowedOrigins(): Set<string> {
    const origins = new Set<string>();

    if (this.isValidOrigin(envs.ADMIN_APP_ORIGIN, this.adminOriginPlaceholder)) {
      origins.add(this.normalizeOrigin(envs.ADMIN_APP_ORIGIN));
    }

    return origins;
  }

  getAllowedOrigins(): Set<string> {
    return new Set([...this.getConsumerAllowedOrigins(), ...this.getAdminAllowedOrigins()]);
  }

  private validateOrigin(originCandidate: string | undefined, scope: `consumer` | `admin` | `all`): string | undefined {
    if (!originCandidate) return undefined;

    try {
      const url = new URL(originCandidate);
      const normalized = this.normalizeOrigin(url.origin);
      const allowedOrigins =
        scope === `admin`
          ? this.getAdminAllowedOrigins()
          : scope === `consumer`
            ? this.getConsumerAllowedOrigins()
            : this.getAllowedOrigins();

      if (allowedOrigins.has(normalized)) {
        return normalized;
      }

      if (this.isAllowedLocalDevOrigin(url, scope)) {
        return normalized;
      }
    } catch {
      // ignore invalid url
    }

    return undefined;
  }

  validateConsumerRedirectOrigin(redirectOrigin?: string): string | undefined {
    return this.validateOrigin(redirectOrigin, `consumer`);
  }

  validateConsumerAppScope(appScope?: string | null): ConsumerAppScope | undefined {
    return isKnownConsumerAppScope(appScope) ? appScope : undefined;
  }

  resolveConsumerOriginByScope(appScope: ConsumerAppScope): string | null {
    return this.getConfiguredConsumerOriginsByScope().get(appScope) ?? null;
  }

  resolveDefaultConsumerOrigin(): string | null {
    for (const scope of CONSUMER_APP_SCOPES) {
      const origin = this.resolveConsumerOriginByScope(scope);
      if (origin) {
        return origin;
      }
    }

    return null;
  }

  resolveConsumerAppScope(originCandidate?: string): ConsumerAppScope | undefined {
    if (!originCandidate) return undefined;

    try {
      const url = new URL(originCandidate);
      const normalized = this.normalizeOrigin(url.origin);
      const configuredScope = this.getConfiguredConsumerOriginScopes().get(normalized);
      if (configuredScope) {
        return configuredScope;
      }

      return this.resolveLocalDevConsumerScope(url);
    } catch {
      return undefined;
    }
  }

  validateAdminOrigin(originCandidate?: string): string | undefined {
    return this.validateOrigin(originCandidate, `admin`);
  }

  validateRedirectOrigin(redirectOrigin?: string): string | undefined {
    return this.validateConsumerRedirectOrigin(redirectOrigin);
  }

  private resolveConsumerScopeFromRequestHeaderValue(originCandidate?: string): ConsumerAppScope | undefined {
    const validatedOrigin = this.validateConsumerRedirectOrigin(originCandidate);
    if (!validatedOrigin) return undefined;
    return this.resolveConsumerAppScope(validatedOrigin);
  }

  resolveConsumerRequestScope(requestOrigin?: HeaderValue, requestReferer?: HeaderValue): ConsumerAppScope | undefined {
    const originScope = this.resolveConsumerScopeFromRequestHeaderValue(this.getFirstHeaderValue(requestOrigin));
    if (originScope) {
      return originScope;
    }

    return this.resolveConsumerScopeFromRequestHeaderValue(this.getFirstHeaderValue(requestReferer));
  }

  resolveConsumerOriginFromRequestScope(requestOrigin?: HeaderValue, requestReferer?: HeaderValue): string | null {
    const requestScope = this.resolveConsumerRequestScope(requestOrigin, requestReferer);
    if (!requestScope) return null;
    return this.resolveConsumerOriginByScope(requestScope);
  }

  requestMatchesConsumerScope(
    claimedAppScope: string | null | undefined,
    requestOrigin?: HeaderValue,
    requestReferer?: HeaderValue,
  ): boolean {
    const validatedAppScope = this.validateConsumerAppScope(claimedAppScope);
    if (!validatedAppScope) return false;
    return this.resolveConsumerRequestScope(requestOrigin, requestReferer) === validatedAppScope;
  }

  resolveConsumerRequestOrigin(requestOrigin?: HeaderValue, requestReferer?: HeaderValue): string | undefined {
    const originHeader = this.getFirstHeaderValue(requestOrigin);
    if (originHeader) {
      const validatedOrigin = this.validateConsumerRedirectOrigin(originHeader);
      if (validatedOrigin) return validatedOrigin;
    }

    const refererHeader = this.getFirstHeaderValue(requestReferer);
    if (refererHeader) {
      return this.validateConsumerRedirectOrigin(refererHeader);
    }

    return undefined;
  }

  resolveConsumerRequestAppScope(
    requestOrigin?: HeaderValue,
    requestReferer?: HeaderValue,
  ): ConsumerAppScope | undefined {
    return this.resolveConsumerRequestScope(requestOrigin, requestReferer);
  }

  resolveAdminRequestOrigin(requestOrigin?: HeaderValue, requestReferer?: HeaderValue): string | undefined {
    const originHeader = this.getFirstHeaderValue(requestOrigin);
    if (originHeader) {
      const validatedOrigin = this.validateAdminOrigin(originHeader);
      if (validatedOrigin) return validatedOrigin;
    }

    const refererHeader = this.getFirstHeaderValue(requestReferer);
    if (refererHeader) {
      return this.validateAdminOrigin(refererHeader);
    }

    return undefined;
  }

  resolveRequestOrigin(requestOrigin?: HeaderValue, requestReferer?: HeaderValue): string | undefined {
    return this.resolveConsumerRequestOrigin(requestOrigin, requestReferer);
  }

  resolveRequestOriginForPath(
    path: string,
    requestOrigin?: HeaderValue,
    requestReferer?: HeaderValue,
  ): string | undefined {
    return path.startsWith(`/api/admin/`)
      ? this.resolveAdminRequestOrigin(requestOrigin, requestReferer)
      : this.resolveConsumerRequestOrigin(requestOrigin, requestReferer);
  }

  resolveConsumerRedirectOrigin(redirectOrigin?: string): string | null {
    const validatedRedirectOrigin = this.validateConsumerRedirectOrigin(redirectOrigin);
    if (validatedRedirectOrigin) {
      return validatedRedirectOrigin;
    }

    return this.resolveDefaultConsumerOrigin();
  }

  resolveConsumerOriginFromRequest(
    redirectOrigin?: string,
    requestOrigin?: HeaderValue,
    requestReferer?: HeaderValue,
  ): string | null {
    return (
      this.validateConsumerRedirectOrigin(redirectOrigin) ??
      this.resolveConsumerRequestOrigin(requestOrigin, requestReferer) ??
      this.resolveConsumerRedirectOrigin()
    );
  }
}
