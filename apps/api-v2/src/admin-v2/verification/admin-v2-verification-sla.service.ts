import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { $Enums } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

const ACTIVE_VERIFICATION_STATUSES = [
  $Enums.VerificationStatus.PENDING,
  $Enums.VerificationStatus.MORE_INFO,
  $Enums.VerificationStatus.FLAGGED,
] as const;
const VERIFICATION_SLA_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminV2VerificationSlaService implements OnModuleInit {
  private readonly logger = new Logger(AdminV2VerificationSlaService.name);
  private breachedConsumerIds = new Set<string>();
  private lastComputedAt: Date | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshBreaches();
  }

  @Cron(`*/5 * * * *`)
  async refreshBreaches(): Promise<void> {
    try {
      const now = Date.now();
      const active = await this.prisma.consumerModel.findMany({
        where: {
          deletedAt: null,
          verificationStatus: { in: [...ACTIVE_VERIFICATION_STATUSES] },
        },
        select: {
          id: true,
          createdAt: true,
          verificationUpdatedAt: true,
        },
      });
      this.breachedConsumerIds = new Set(
        active
          .filter((item) => {
            const referenceTs = item.verificationUpdatedAt?.getTime() ?? item.createdAt.getTime();
            return now - referenceTs >= VERIFICATION_SLA_MS;
          })
          .map((item) => item.id),
      );
      this.lastComputedAt = new Date();
    } catch (error) {
      this.logger.warn(`Admin v2 verification SLA refresh failed`, {
        message: error instanceof Error ? error.message : `Unknown`,
      });
    }
  }

  async getSnapshot(): Promise<{
    breachedConsumerIds: Set<string>;
    lastComputedAt: string | null;
    thresholdHours: number;
  }> {
    if (!this.lastComputedAt) {
      await this.refreshBreaches();
    }
    return {
      breachedConsumerIds: new Set(this.breachedConsumerIds),
      lastComputedAt: this.lastComputedAt?.toISOString() ?? null,
      thresholdHours: VERIFICATION_SLA_MS / (60 * 60 * 1000),
    };
  }
}
