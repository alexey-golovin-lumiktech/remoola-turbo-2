import { Injectable } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';

import { envs } from '../envs';

type HeaderValue = string | string[] | undefined;

@Injectable()
export class OriginResolverService {
  private readonly defaultOriginPlaceholder = `CONSUMER_APP_ORIGIN`;
  private readonly mobileOriginPlaceholder = `CONSUMER_MOBILE_APP_ORIGIN`;
  private readonly adminOriginPlaceholder = `ADMIN_APP_ORIGIN`;
  private readonly consumerLocalDevOriginScopes = new Map<string, ConsumerAppScope>([
    [`3001`, `consumer`],
    [`3002`, `consumer-mobile`],
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

  private getConfiguredConsumerOriginScopes(): Map<string, ConsumerAppScope> {
    const scopes = new Map<string, ConsumerAppScope>();

    if (this.isValidOrigin(envs.CONSUMER_APP_ORIGIN, this.defaultOriginPlaceholder)) {
      scopes.set(this.normalizeOrigin(envs.CONSUMER_APP_ORIGIN), `consumer`);
    }

    if (this.isValidOrigin(envs.CONSUMER_MOBILE_APP_ORIGIN, this.mobileOriginPlaceholder)) {
      scopes.set(this.normalizeOrigin(envs.CONSUMER_MOBILE_APP_ORIGIN), `consumer-mobile`);
    }

    return scopes;
  }

  private getFirstHeaderValue(headerValue: HeaderValue): string | undefined {
    if (Array.isArray(headerValue)) {
      return headerValue.find((entry): entry is string => typeof entry === `string` && entry.trim().length > 0)?.trim();
    }

    return typeof headerValue === `string` && headerValue.trim().length > 0 ? headerValue.trim() : undefined;
  }

  getConsumerAllowedOrigins(): Set<string> {
    return new Set(this.getConfiguredConsumerOriginScopes().keys());
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

  validateConsumerReturnOrigin(returnOrigin?: string): string | undefined {
    return this.validateOrigin(returnOrigin, `consumer`);
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

  validateReturnOrigin(returnOrigin?: string): string | undefined {
    return this.validateConsumerReturnOrigin(returnOrigin);
  }

  resolveConsumerRequestOrigin(requestOrigin?: HeaderValue, requestReferer?: HeaderValue): string | undefined {
    const originHeader = this.getFirstHeaderValue(requestOrigin);
    if (originHeader) {
      const validatedOrigin = this.validateConsumerReturnOrigin(originHeader);
      if (validatedOrigin) return validatedOrigin;
    }

    const refererHeader = this.getFirstHeaderValue(requestReferer);
    if (refererHeader) {
      return this.validateConsumerReturnOrigin(refererHeader);
    }

    return undefined;
  }

  resolveConsumerRequestAppScope(
    requestOrigin?: HeaderValue,
    requestReferer?: HeaderValue,
  ): ConsumerAppScope | undefined {
    const originHeader = this.getFirstHeaderValue(requestOrigin);
    if (originHeader) {
      const validatedOrigin = this.validateConsumerReturnOrigin(originHeader);
      if (validatedOrigin) {
        return this.resolveConsumerAppScope(validatedOrigin);
      }
    }

    const refererHeader = this.getFirstHeaderValue(requestReferer);
    if (refererHeader) {
      const validatedOrigin = this.validateConsumerReturnOrigin(refererHeader);
      if (validatedOrigin) {
        return this.resolveConsumerAppScope(validatedOrigin);
      }
    }

    return undefined;
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

  resolveConsumerOrigin(returnOrigin?: string): string | null {
    const validatedReturnOrigin = this.validateConsumerReturnOrigin(returnOrigin);
    if (validatedReturnOrigin) {
      return validatedReturnOrigin;
    }

    for (const origin of this.getConfiguredConsumerOriginScopes().keys()) {
      return origin;
    }

    return null;
  }
}
