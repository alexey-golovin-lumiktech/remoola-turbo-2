import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

import { $Enums, Prisma } from '@remoola/database-2';

import { GoogleOAuth } from './dto/google-oauth.dto';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class GoogleOAuthService {
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
  async googleLoginGPT(dto: GoogleOAuth) {
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
    const existing = await this.prisma.consumerModel.findUnique({
      where: { email },
      include: { personalDetails: true },
    });

    const hasNameUpdate = payload.firstName || payload.lastName;

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
              ...(payload.firstName ? { firstName: payload.firstName } : {}),
              ...(payload.lastName ? { lastName: payload.lastName } : {}),
            },
          };
        } else {
          // Create new personalDetails row
          updateData.personalDetails = {
            create: {
              firstName: payload.firstName ?? null,
              lastName: payload.lastName ?? null,
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
                firstName: payload.firstName ?? null,
                lastName: payload.lastName ?? null,
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
        return this.prisma.consumerModel.findUniqueOrThrow({
          where: { email },
          include: { personalDetails: true },
        });
      }
      throw err;
    }
  }

  private async upsertGoogleProfileDetails(consumerId: string, payload: Record<string, any>) {
    const { email, email_verified, name, given_name, family_name, picture, hd } = payload;

    const organization = typeof hd === `string` && hd.length > 0 ? (hd as string) : null;

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
