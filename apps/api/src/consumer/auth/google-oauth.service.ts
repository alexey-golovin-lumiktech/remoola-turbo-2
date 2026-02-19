import crypto from 'crypto';

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { type CodeChallengeMethod } from 'google-auth-library/build/src/auth/oauth2client';

import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { GoogleOAuthBody } from './dto/google-oauth.dto';
import { envs } from '../../envs';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class GoogleOAuthService {
  private client: OAuth2Client;
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly oauthScopes = [`openid`, `email`, `profile`];

  constructor(
    private readonly prisma: PrismaService,
    // private readonly authService: AuthService, // <– if you want to issue tokens here
  ) {
    const clientId = envs.GOOGLE_CLIENT_ID;
    const clientSecret = envs.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${envs.NEST_APP_EXTERNAL_ORIGIN}/consumer/auth/google/callback`;

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
    this.redirectUri = redirectUri;
    this.client = new OAuth2Client({
      clientId,
      clientSecret,
      redirectUri,
    });
  }

  /**
   * Main entry: sign in / sign up consumer with Google.
   * If consumer doesn't exist → create with password=null.
   * Always upsert GoogleProfileDetails.
   */
  async googleLoginGPT(body: GoogleOAuthBody) {
    const payload = await this.verifyIdToken(body.idToken);

    const email = payload.email?.toLowerCase();
    const emailVerified = !!payload.email_verified;

    if (!email) {
      throw new BadRequestException(errorCodes.GOOGLE_ACCOUNT_NO_EMAIL_LOGIN);
    }
    if (!emailVerified) {
      throw new UnauthorizedException(errorCodes.GOOGLE_EMAIL_NOT_VERIFIED_LOGIN);
    }

    const consumer = await this.loginWithPayload(email, payload);

    // 3. Optionally issue tokens via your existing auth service
    // const tokens = await this.authService.issueTokensForConsumer(consumer);

    return {
      consumer: {
        id: consumer.id,
        email: consumer.email,
        accountType: consumer.accountType,
        contractorKind: consumer.contractorKind,
        firstName: consumer.personalDetails?.firstName,
        lastName: consumer.personalDetails?.lastName,
        verified: consumer.verified,
        legalVerified: consumer.legalVerified,
        stripeCustomerId: consumer.stripeCustomerId,
        createdAt: consumer.createdAt,
      },
      // tokens,
    };
  }

  async loginWithPayload(email: string, payload: TokenPayload) {
    // 1. Get or create consumer
    const consumer = await this.upsertConsumerFromGooglePayload(email, payload);
    await this.assertSafeGoogleLink(consumer.id, payload);

    // 2. Upsert GoogleProfileDetails
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
      redirect_uri: this.redirectUri,
      response_type: `code`,
    };
    return this.client.generateAuthUrl(options);
  }

  async exchangeCodeForPayload(code: string, codeVerifier: string, nonce: string) {
    const tokenResponse = await this.client.getToken({
      code,
      codeVerifier,
      redirect_uri: this.redirectUri,
    });

    const idToken = tokenResponse.tokens.id_token;
    if (!idToken) {
      throw new UnauthorizedException(errorCodes.MISSING_GOOGLE_ID_TOKEN);
    }

    return this.verifyIdToken(idToken, nonce);
  }

  static createCodeVerifier() {
    return crypto.randomBytes(32).toString(`base64url`);
  }

  static createCodeChallenge(codeVerifier: string) {
    return crypto.createHash(`sha256`).update(codeVerifier).digest(`base64url`);
  }

  /**
   * Create or reuse a Consumer based on Google profile email.
   *
   * Business logic:
   * - If user already exists: just return that consumer.
   * - If not: create a new Consumer with:
   *     - accountType: CONTRACTOR
   *     - contractorKind: INDIVIDUAL
   *     - password/salt: null
   *
   * You can later allow user to upgrade to BUSINESS or ENTITY etc.
   */
  private async upsertConsumerFromGooglePayload(email: string, payload: TokenPayload) {
    const existing = await this.prisma.consumerModel.findFirst({
      where: { email, deletedAt: null },
      include: { personalDetails: true },
    });

    const hasNameUpdate = payload.given_name || payload.family_name;

    if (existing) {
      const updateData: any = {};

      // Mark verified if Google says so
      if (!existing.verified && payload.email_verified) {
        updateData.verified = true;
      }

      // PERSONAL DETAILS UPDATE LOGIC
      if (hasNameUpdate) {
        if (existing.personalDetails) {
          // Update existing personalDetails row
          updateData.personalDetails = {
            update: {
              ...(payload.given_name ? { firstName: payload.given_name } : {}),
              ...(payload.family_name ? { lastName: payload.family_name } : {}),
            },
          };
        } else {
          // Create new personalDetails row
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

      // Nothing to update
      if (Object.keys(updateData).length === 0) {
        return existing;
      }

      const updated = await this.prisma.consumerModel.update({
        where: { id: existing.id },
        data: updateData,
        include: { personalDetails: true },
      });

      return updated;
    }

    // CONSUMER DOES NOT EXIST → CREATE NEW
    try {
      const consumer = await this.prisma.consumerModel.create({
        data: {
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
        },
        include: { personalDetails: true },
      });

      return consumer;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        return this.prisma.consumerModel.findFirstOrThrow({
          where: { email, deletedAt: null },
          include: { personalDetails: true },
        });
      }
      throw err;
    }
  }

  private async upsertGoogleProfileDetails(consumerId: string, payload: TokenPayload) {
    const { email, email_verified, name, given_name, family_name, picture, hd } = payload;

    const organization = typeof hd === `string` && hd.length > 0 ? (hd as string) : null;
    const metadata = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;

    await this.prisma.googleProfileDetailsModel.upsert({
      where: { consumerId },
      update: {
        email: email ?? ``,
        emailVerified: !!email_verified,
        name: (name as string) ?? null,
        givenName: (given_name as string) ?? null,
        familyName: (family_name as string) ?? null,
        picture: (picture as string) ?? null,
        organization,
        metadata,
      },
      create: {
        email: email ?? ``,
        emailVerified: !!email_verified,
        name: (name as string) ?? null,
        givenName: (given_name as string) ?? null,
        familyName: (family_name as string) ?? null,
        picture: (picture as string) ?? null,
        organization,
        metadata,
        consumer: {
          connect: { id: consumerId },
        },
      },
    });
  }

  private async assertSafeGoogleLink(consumerId: string, payload: TokenPayload) {
    const incomingSub = typeof payload.sub === `string` && payload.sub.length > 0 ? payload.sub : null;
    if (!incomingSub) return;

    const existing = await this.prisma.googleProfileDetailsModel.findUnique({
      where: { consumerId },
      select: { metadata: true },
    });
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
}
