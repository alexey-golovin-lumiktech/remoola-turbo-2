import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

type UpsertConsumerGoogleProfileParams = {
  consumerId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  givenName: string | null;
  familyName: string | null;
  picture: string | null;
  organization: string | null;
  metadata: Prisma.InputJsonValue;
};

@Injectable()
export class ConsumerGoogleProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertProfile(params: UpsertConsumerGoogleProfileParams) {
    return this.prisma.googleProfileDetailsModel.upsert({
      where: { consumerId: params.consumerId },
      update: {
        email: params.email,
        emailVerified: params.emailVerified,
        name: params.name,
        givenName: params.givenName,
        familyName: params.familyName,
        picture: params.picture,
        organization: params.organization,
        metadata: params.metadata,
      },
      create: {
        email: params.email,
        emailVerified: params.emailVerified,
        name: params.name,
        givenName: params.givenName,
        familyName: params.familyName,
        picture: params.picture,
        organization: params.organization,
        metadata: params.metadata,
        consumer: {
          connect: { id: params.consumerId },
        },
      },
    });
  }
}
