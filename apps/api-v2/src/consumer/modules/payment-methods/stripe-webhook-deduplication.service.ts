import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class StripeWebhookDeduplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async hasProcessed(eventId: string) {
    const processedEvent = await this.prisma.stripeWebhookEventModel.findUnique({
      where: { eventId },
      select: { eventId: true },
    });
    return Boolean(processedEvent);
  }

  async recordProcessed(eventId: string) {
    try {
      await this.prisma.stripeWebhookEventModel.create({
        data: { eventId },
      });
      return `created` as const;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === `P2002`) {
        return `duplicate` as const;
      }
      throw error;
    }
  }
}
