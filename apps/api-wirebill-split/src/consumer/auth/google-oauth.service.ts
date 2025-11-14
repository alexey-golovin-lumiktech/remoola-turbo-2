import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

import { AccountType, ContractorKind, Prisma } from '@remoola/database';

import { GoogleOAuthGPT } from './dto/google-oauth.dto';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class GoogleOAuthServiceGPT {
  private client: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    // private readonly authService: AuthService, // <– if you want to issue tokens here
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    if (!clientId) {
      throw new Error(`GOOGLE_CLIENT_ID is not configured`);
    }
    this.client = new OAuth2Client(clientId);
  }

  /**
   * Main entry: sign in / sign up consumer with Google.
   * If consumer doesn't exist → create with password=null.
   * Always upsert GoogleProfileDetails.
   */
  async googleLoginGPT(dto: GoogleOAuthGPT) {
    const payload = await this.verifyIdToken(dto.idToken);

    const email = payload.email?.toLowerCase();
    const emailVerified = !!payload.email_verified;

    if (!email) {
      throw new BadRequestException(`Google account has no email`);
    }
    if (!emailVerified) {
      throw new UnauthorizedException(`Google email is not verified`);
    }

    // 1. Get or create consumer
    const consumer = await this.upsertConsumerFromGooglePayload(email, payload);

    // 2. Upsert GoogleProfileDetails
    await this.upsertGoogleProfileDetails(consumer.id, payload);

    // 3. Optionally issue tokens via your existing auth service
    // const tokens = await this.authService.issueTokensForConsumer(consumer);

    return {
      consumer: {
        id: consumer.id,
        email: consumer.email,
        accountType: consumer.accountType,
        contractorKind: consumer.contractorKind,
        firstName: consumer.firstName,
        lastName: consumer.lastName,
        verified: consumer.verified,
        legalVerified: consumer.legalVerified,
        stripeCustomerId: consumer.stripeCustomerId,
        createdAt: consumer.createdAt,
      },
      // tokens,
    };
  }

  private async verifyIdToken(idToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException(`Invalid Google token payload`);
      }

      return payload;
    } catch {
      throw new UnauthorizedException(`Invalid Google ID token`);
    }
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
  private async upsertConsumerFromGooglePayload(email: string, payload: Record<string, any>) {
    const existing = await this.prisma.consumer.findUnique({
      where: { email },
    });

    if (existing) {
      // Optionally mark verified if Google says so
      if (!existing.verified && payload.email_verified) {
        return this.prisma.consumer.update({
          where: { id: existing.id },
          data: {
            verified: true,
          },
        });
      }
      return existing;
    }

    // No consumer → create new one (minimal profile; extended later via forms)
    try {
      const consumer = await this.prisma.consumer.create({
        data: {
          email,
          accountType: AccountType.CONTRACTOR,
          contractorKind: ContractorKind.INDIVIDUAL,
          password: null,
          salt: null,
          verified: !!payload.email_verified,
          legalVerified: false,
          firstName: (payload.given_name as string) ?? null,
          lastName: (payload.family_name as string) ?? null,
          howDidHearAboutUs: null,
          stripeCustomerId: null,
        },
      });

      return consumer;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        // Unique constraint conflict (race) → refetch by email
        return this.prisma.consumer.findUniqueOrThrow({
          where: { email },
        });
      }
      throw err;
    }
  }

  private async upsertGoogleProfileDetails(consumerId: string, payload: Record<string, any>) {
    const { email, email_verified, name, given_name, family_name, picture, hd } = payload;

    const organization = typeof hd === `string` && hd.length > 0 ? (hd as string) : null;

    await this.prisma.googleProfileDetails.upsert({
      where: { consumerId }, // unique
      update: {
        email: email ?? ``,
        emailVerified: !!email_verified,
        name: (name as string) ?? null,
        givenName: (given_name as string) ?? null,
        familyName: (family_name as string) ?? null,
        picture: (picture as string) ?? null,
        organization,
        metadata: payload,
      },
      create: {
        email: email ?? ``,
        emailVerified: !!email_verified,
        name: (name as string) ?? null,
        givenName: (given_name as string) ?? null,
        familyName: (family_name as string) ?? null,
        picture: (picture as string) ?? null,
        organization,
        metadata: payload,
        consumer: {
          connect: { id: consumerId },
        },
      },
    });
  }
}
