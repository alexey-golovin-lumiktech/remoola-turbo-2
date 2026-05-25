import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { type CodeChallengeMethod } from 'google-auth-library/build/src/auth/oauth2client';

import { $Enums, Prisma } from '@remoola/database-2';
import { oauthCrypto } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerGoogleProfileQuery } from './consumer-google-profile.query';
import { ConsumerGoogleProfileRepository } from './consumer-google-profile.repository';
import { envs } from '../../../envs';
import { NgrokIngressService } from '../../../infrastructure/ngrok/ngrok-ingress.service';
import { ConsumerIdentityRepository } from '../identity/consumer-identity.repository';

@Injectable()
export class GoogleOAuthService {
  private client: OAuth2Client;
  private readonly clientId: string;
  private readonly oauthScopes = [`openid`, `email`, `profile`];

  private resolveOAuthExternalOrigin() {
    const configuredOrigin = envs.NEST_APP_EXTERNAL_ORIGIN.replace(/\/$/, ``);
    if (!envs.NGROK_OAUTH_REDIRECT_ENABLED) {
      return configuredOrigin;
    }

    const listenerUrl = this.ngrokIngress.getListenerUrl();
    if (!listenerUrl) {
      return configuredOrigin;
    }

    try {
      return new URL(listenerUrl).origin;
    } catch {
      return configuredOrigin;
    }
  }

  private getRedirectUri() {
    return `${this.resolveOAuthExternalOrigin()}/consumer/auth/google/callback`;
  }

  constructor(
    private readonly consumerIdentityRepository: ConsumerIdentityRepository,
    private readonly googleProfileQuery: ConsumerGoogleProfileQuery,
    private readonly googleProfileRepository: ConsumerGoogleProfileRepository,
    private readonly ngrokIngress: NgrokIngressService,
  ) {
    const clientId = envs.GOOGLE_CLIENT_ID;
    const clientSecret = envs.GOOGLE_CLIENT_SECRET;

    if (!clientId || clientId === `GOOGLE_CLIENT_ID`) {
      throw new Error(`GOOGLE_CLIENT_ID is not configured`);
    }
    if (!clientSecret || clientSecret === `GOOGLE_CLIENT_SECRET`) {
      throw new Error(`GOOGLE_CLIENT_SECRET is not configured`);
    }
    if (!envs.NEST_APP_EXTERNAL_ORIGIN || envs.NEST_APP_EXTERNAL_ORIGIN === `NEST_APP_EXTERNAL_ORIGIN`) {
      throw new Error(`NEST_APP_EXTERNAL_ORIGIN is not configured`);
    }

    this.clientId = clientId;

    this.client = new OAuth2Client({
      clientId,
      clientSecret,
    });
  }

  async loginWithPayload(email: string, payload: TokenPayload) {
    const consumer = await this.upsertConsumerFromGooglePayload(email, payload);
    await this.assertSafeGoogleLink(consumer.id, payload);

    await this.upsertGoogleProfileDetails(consumer.id, payload);

    return consumer;
  }

  async verifyIdToken(idToken: string, nonce?: string) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException(errorCodes.INVALID_GOOGLE_TOKEN_PAYLOAD);
      }

      if (nonce) {
        if (!payload.nonce) {
          throw new UnauthorizedException(errorCodes.MISSING_GOOGLE_NONCE);
        }
        if (payload.nonce !== nonce) {
          throw new UnauthorizedException(errorCodes.INVALID_GOOGLE_NONCE);
        }
      }

      return payload;
    } catch {
      throw new UnauthorizedException(errorCodes.INVALID_GOOGLE_ID_TOKEN);
    }
  }

  buildAuthorizationUrl(state: string, codeChallenge: string, nonce: string) {
    const options = {
      scope: this.oauthScopes,
      state,
      nonce,
      prompt: `select_account`,
      include_granted_scopes: true,
      code_challenge: codeChallenge,
      code_challenge_method: `S256` as CodeChallengeMethod,
      redirect_uri: this.getRedirectUri(),
      response_type: `code`,
    };
    return this.client.generateAuthUrl(options);
  }

  async exchangeCodeForPayload(code: string, codeVerifier: string, nonce: string) {
    const tokenResponse = await this.client.getToken({
      code,
      codeVerifier,
      redirect_uri: this.getRedirectUri(),
    });

    const idToken = tokenResponse.tokens.id_token;
    if (!idToken) {
      throw new UnauthorizedException(errorCodes.MISSING_GOOGLE_ID_TOKEN);
    }

    return this.verifyIdToken(idToken, nonce);
  }

  static createCodeVerifier() {
    return oauthCrypto.generatePKCEVerifier();
  }

  static createCodeChallenge(codeVerifier: string) {
    return oauthCrypto.generatePKCEChallenge(codeVerifier);
  }

  private async upsertConsumerFromGooglePayload(email: string, payload: TokenPayload) {
    const existing = await this.consumerIdentityRepository.findGoogleLoginCandidateByEmail(email);

    const hasNameUpdate = payload.given_name || payload.family_name;

    if (existing) {
      const updateData: Prisma.ConsumerModelUpdateInput = {};

      if (!existing.verified && payload.email_verified) {
        updateData.verified = true;
      }

      if (hasNameUpdate) {
        if (existing.personalDetails) {
          updateData.personalDetails = {
            update: {
              ...(payload.given_name ? { firstName: payload.given_name } : {}),
              ...(payload.family_name ? { lastName: payload.family_name } : {}),
            },
          };
        } else {
          updateData.personalDetails = {
            create: {
              firstName: payload.given_name ?? null,
              lastName: payload.family_name ?? null,
              citizenOf: null,
              dateOfBirth: null,
              passportOrIdNumber: null,
            },
          };
        }
      }

      if (Object.keys(updateData).length === 0) {
        return existing;
      }

      const updated = await this.consumerIdentityRepository.updateGoogleLoginConsumer(existing.id, updateData);

      return updated;
    }

    try {
      const consumer = await this.consumerIdentityRepository.createGoogleLoginConsumer({
        email,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        password: null,
        salt: null,
        verified: !!payload.email_verified,
        legalVerified: false,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
        stripeCustomerId: null,
        ...(hasNameUpdate && {
          personalDetails: {
            create: {
              firstName: payload.given_name ?? null,
              lastName: payload.family_name ?? null,
              citizenOf: null,
              dateOfBirth: null,
              passportOrIdNumber: null,
            },
          },
        }),
      });

      return consumer;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        return this.consumerIdentityRepository.findGoogleLoginCandidateByEmailOrThrow(email);
      }
      throw err;
    }
  }

  private async upsertGoogleProfileDetails(consumerId: string, payload: TokenPayload) {
    await this.googleProfileRepository.upsertProfile(this.buildGoogleProfileParams(consumerId, payload));
  }

  private async assertSafeGoogleLink(consumerId: string, payload: TokenPayload) {
    const incomingSub = typeof payload.sub === `string` && payload.sub.length > 0 ? payload.sub : null;
    if (!incomingSub) return;

    const existing = await this.googleProfileQuery.findMetadataByConsumerId(consumerId);
    if (!existing?.metadata) return;

    const existingSub = this.extractSubFromMetadata(existing.metadata);
    if (!existingSub) return;
    if (existingSub !== incomingSub) {
      throw new UnauthorizedException(errorCodes.GOOGLE_ACCOUNT_MISMATCH);
    }
  }

  private extractSubFromMetadata(metadata: Prisma.JsonValue) {
    if (!metadata || typeof metadata !== `object` || Array.isArray(metadata)) return null;
    const value = (metadata as Record<string, unknown>).sub;
    if (typeof value === `string` && value.length > 0) return value;
    return null;
  }

  private buildGoogleProfileParams(consumerId: string, payload: TokenPayload) {
    const { email, email_verified, name, given_name, family_name, picture, hd } = payload;

    return {
      consumerId,
      email: email ?? ``,
      emailVerified: !!email_verified,
      name: (name as string) ?? null,
      givenName: (given_name as string) ?? null,
      familyName: (family_name as string) ?? null,
      picture: (picture as string) ?? null,
      organization: typeof hd === `string` && hd.length > 0 ? hd : null,
      metadata: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
    };
  }
}
