import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { OriginResolverService } from '../../shared/origin-resolver.service';

@Injectable()
export class AdminV2AdminLinks {
  constructor(private readonly originResolver: OriginResolverService) {}

  resolveAdminV2Origin(): string {
    const configuredOrigin = this.originResolver.resolveConfiguredAdminOrigin();
    if (configuredOrigin) {
      return configuredOrigin;
    }
    throw new InternalServerErrorException(`Admin v2 app origin is not configured`);
  }

  buildInvitationUrl(token: string): string {
    const inviteUrl = new URL(`/accept-invite`, this.resolveAdminV2Origin());
    inviteUrl.searchParams.set(`token`, token);
    return inviteUrl.toString();
  }

  buildPasswordResetUrl(token: string): string {
    const resetUrl = new URL(`/reset-password`, this.resolveAdminV2Origin());
    resetUrl.searchParams.set(`token`, token);
    return resetUrl.toString();
  }
}
