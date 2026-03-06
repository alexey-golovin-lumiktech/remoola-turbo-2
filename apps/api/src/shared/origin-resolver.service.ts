import { Injectable } from '@nestjs/common';

import { envs } from '../envs';

@Injectable()
export class OriginResolverService {
  private readonly defaultOriginPlaceholder = `CONSUMER_APP_ORIGIN`;
  private readonly mobileOriginPlaceholder = `CONSUMER_MOBILE_APP_ORIGIN`;
  private readonly adminOriginPlaceholder = `ADMIN_APP_ORIGIN`;

  normalizeOrigin(origin: string): string {
    return origin.replace(/\/$/, ``);
  }

  private isValidOrigin(origin: string | undefined, placeholder: string): boolean {
    return !!origin && origin !== placeholder;
  }

  getAllowedOrigins(): Set<string> {
    const origins = new Set<string>();

    if (this.isValidOrigin(envs.CONSUMER_APP_ORIGIN, this.defaultOriginPlaceholder)) {
      origins.add(this.normalizeOrigin(envs.CONSUMER_APP_ORIGIN));
    }

    if (this.isValidOrigin(envs.CONSUMER_MOBILE_APP_ORIGIN, this.mobileOriginPlaceholder)) {
      origins.add(this.normalizeOrigin(envs.CONSUMER_MOBILE_APP_ORIGIN));
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
    } catch {
      // ignore invalid url
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

    if (this.isValidOrigin(envs.CONSUMER_MOBILE_APP_ORIGIN, this.mobileOriginPlaceholder)) {
      return envs.CONSUMER_MOBILE_APP_ORIGIN;
    }

    return envs.CORS_ALLOWED_ORIGINS?.[0] ?? null;
  }
}
