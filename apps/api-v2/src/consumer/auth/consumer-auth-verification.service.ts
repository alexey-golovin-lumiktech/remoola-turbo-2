import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type ConsumerAppScope } from '@remoola/api-types';
import { errorCodes } from '@remoola/shared-constants';

import { type IJwtTokenPayload } from '../../dtos/consumer';
import { envs } from '../../envs';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';

import type express from 'express';

@Injectable()
export class ConsumerAuthVerificationService {
  private readonly logger = new Logger(ConsumerAuthVerificationService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailingService: MailingService,
    private readonly originResolver: OriginResolverService,
  ) {}

  async signupVerification(token: string, res: express.Response) {
    const redirectWith = (verifiedFlag: `yes` | `no`, appScope?: string | null, emailForQuery?: string) => {
      const redirectUrl = new URL(`/signup/verification`, this.resolveSignupVerificationOrigin(appScope));
      redirectUrl.searchParams.set(`verified`, verifiedFlag);
      if (emailForQuery) redirectUrl.searchParams.set(`email`, emailForQuery);
      res.redirect(redirectUrl.toString());
    };

    let verified: IJwtTokenPayload;
    try {
      verified = this.jwtService.verify<IJwtTokenPayload>(token);
    } catch {
      const decoded = this.decodeJwtPayload(token);
      redirectWith(`no`, decoded?.appScope);
      return;
    }

    const appScope = this.originResolver.validateConsumerAppScope(verified.appScope);

    if (!appScope || verified.typ !== `access` || verified.scope !== `consumer` || verified.sid) {
      redirectWith(`no`, verified.appScope);
      return;
    }

    const identityId = this.resolveIdentityId(verified);
    if (!identityId) {
      redirectWith(`no`, appScope);
      return;
    }

    const identity = await this.prisma.consumerModel.findFirst({
      where: { id: identityId, deletedAt: null },
    });

    if (!identity?.email) {
      redirectWith(`no`, appScope);
      return;
    }

    const updated = await this.prisma.consumerModel.update({
      where: { id: identity.id },
      data: { verified: true },
    });
    const verifiedFlag: `yes` | `no` = !updated || updated.verified === false ? `no` : `yes`;
    redirectWith(verifiedFlag, appScope, identity.email);
  }

  async resendSignupVerificationEmail(consumerId: string, appScope: ConsumerAppScope): Promise<boolean> {
    const validatedAppScope = this.originResolver.validateConsumerAppScope(appScope);
    if (!validatedAppScope) {
      throw new BadRequestException(`Invalid app scope`);
    }

    const consumer = await this.prisma.consumerModel.findFirst({
      where: { id: consumerId, deletedAt: null },
      select: {
        id: true,
        email: true,
        verified: true,
      },
    });
    if (!consumer) {
      throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_COMPLETE_PROFILE);
    }
    if (consumer.verified) {
      throw new ConflictException(`Signup verification email is not applicable for an already verified consumer`);
    }

    const token = await this.getSignupVerificationToken(consumer.id, validatedAppScope);
    return this.mailingService.sendConsumerSignupVerificationEmailSafe({
      email: consumer.email,
      token,
    });
  }

  async completeProfileCreationAndSendVerificationEmail(consumerId: string, appScope: ConsumerAppScope) {
    const validatedAppScope = this.originResolver.validateConsumerAppScope(appScope);
    if (!validatedAppScope) {
      throw new BadRequestException(`Invalid app scope`);
    }

    const consumer = await this.prisma.consumerModel.findFirst({ where: { id: consumerId } });
    if (!consumer) throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_COMPLETE_PROFILE);
    if (consumer.verified) {
      this.logger.log({
        event: `consumer_complete_profile_creation_skipped_already_verified`,
        consumerId,
      });
      return;
    }
    const token = await this.getSignupVerificationToken(consumer.id, validatedAppScope);
    await this.mailingService.sendConsumerSignupVerificationEmail({
      email: consumer.email,
      token,
    });
  }

  private resolveSignupVerificationOrigin(appScope?: string | null): string {
    const resolvedAppScope = this.originResolver.validateConsumerAppScope(appScope);
    const origin = resolvedAppScope ? this.originResolver.resolveConsumerOriginByScope(resolvedAppScope) : null;
    if (!origin) {
      throw new BadRequestException(errorCodes.ORIGIN_REQUIRED);
    }
    return origin;
  }

  private decodeJwtPayload(token: string): IJwtTokenPayload | null {
    const decoded = this.jwtService.decode(token);
    if (!decoded || typeof decoded !== `object`) {
      return null;
    }
    return decoded as IJwtTokenPayload;
  }

  private getSignupVerificationToken(identityId: string, appScope: ConsumerAppScope) {
    return this.jwtService.signAsync(
      { sub: identityId, identityId, typ: `access` as const, scope: `consumer` as const, appScope },
      { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    );
  }

  private resolveIdentityId(payload: IJwtTokenPayload): string | null {
    return payload.identityId ?? payload.sub ?? null;
  }
}
