import { Injectable } from '@nestjs/common';

import { CURRENT_CONSUMER_APP_SCOPE, parseConsumerAppScope, type ConsumerAppScope } from '@remoola/api-types';

import { envs } from '../envs';

type HeaderValue = string | string[] | undefined;

@Injectable()
export class OriginResolverService {
  private readonly cssGridOriginPlaceholder = `CONSUMER_CSS_GRID_APP_ORIGIN`;
  private readonly adminV2OriginPlaceholder = `ADMIN_V2_APP_ORIGIN`;
  private readonly consumerLocalDevOriginScopes = new Map<string, ConsumerAppScope>([
    [`3001`, CURRENT_CONSUMER_APP_SCOPE],
    [`3002`, CURRENT_CONSUMER_APP_SCOPE],
    [`3003`, CURRENT_CONSUMER_APP_SCOPE],
  ]);
  private readonly adminLocalDevAllowedPorts = new Set([`3010`, `3011`]);

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

    if (this.isValidOrigin(envs.CONSUMER_CSS_GRID_APP_ORIGIN, this.cssGridOriginPlaceholder)) {
      origins.set(CURRENT_CONSUMER_APP_SCOPE, this.normalizeOrigin(envs.CONSUMER_CSS_GRID_APP_ORIGIN));
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

  private getFirstHeaderValue(headerValue: HeaderValue): string | undefined {
    if (Array.isArray(headerValue)) {
      return headerValue.find((entry): entry is string => typeof entry === `string` && entry.trim().length > 0)?.trim();
    }

    return typeof headerValue === `string` && headerValue.trim().length > 0 ? headerValue.trim() : undefined;
  }

  getConsumerAllowedOrigins(): Set<string> {
    return new Set(this.getConfiguredConsumerOriginScopes().keys());
  }

  private getConfiguredAdminOriginsInPriorityOrder(): string[] {
    if (this.isValidOrigin(envs.ADMIN_V2_APP_ORIGIN, this.adminV2OriginPlaceholder)) {
      return [this.normalizeOrigin(envs.ADMIN_V2_APP_ORIGIN)];
    }
    return [];
  }

  getAdminAllowedOrigins(): Set<string> {
    return new Set(this.getConfiguredAdminOriginsInPriorityOrder());
  }

  resolveConfiguredAdminOrigin(): string | null {
    return this.getConfiguredAdminOriginsInPriorityOrder()[0] ?? null;
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

  validateConsumerCorsOrigin(originCandidate?: string): string | undefined {
    return this.validateOrigin(originCandidate, `consumer`);
  }

  validateConsumerAppScope(appScope?: string | null): ConsumerAppScope | undefined {
    return parseConsumerAppScope(appScope);
  }

  validateConsumerAppScopeHeader(headerValue?: HeaderValue): ConsumerAppScope | undefined {
    return this.validateConsumerAppScope(this.getFirstHeaderValue(headerValue));
  }

  resolveConsumerOriginByScope(appScope: ConsumerAppScope): string | null {
    return this.getConfiguredConsumerOriginsByScope().get(appScope) ?? null;
  }

  validateAdminOrigin(originCandidate?: string): string | undefined {
    return this.validateOrigin(originCandidate, `admin`);
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
}
