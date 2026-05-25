import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerGoogleProfileQuery {
  constructor(private readonly prisma: PrismaService) {}

  findMetadataByConsumerId(consumerId: string) {
    return this.prisma.googleProfileDetailsModel.findUnique({
      where: { consumerId },
      select: { metadata: true },
    });
  }
}
