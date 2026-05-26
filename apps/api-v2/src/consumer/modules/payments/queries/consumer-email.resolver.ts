import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../shared/prisma.service';

@Injectable()
export class ConsumerEmailResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(consumerId: string): Promise<string | null> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });
    return consumer?.email?.trim().toLowerCase() ?? null;
  }
}
