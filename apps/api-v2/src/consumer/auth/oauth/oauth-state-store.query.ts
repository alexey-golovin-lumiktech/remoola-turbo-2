import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma.service';

type OAuthStateRow = {
  payload: string;
  expiresAt: Date;
};

@Injectable()
export class OAuthStateStoreQuery {
  constructor(private readonly prisma: PrismaService) {}

  readStatePayload(stateKey: string): Promise<OAuthStateRow | null> {
    return this.prisma.oauthStateModel.findUnique({
      where: { stateKey },
      select: { payload: true, expiresAt: true },
    });
  }
}
