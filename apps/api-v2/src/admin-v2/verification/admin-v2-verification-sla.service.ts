import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AdminV2VerificationQuery } from './admin-v2-verification.query';

const VERIFICATION_SLA_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminV2VerificationSlaService implements OnModuleInit {
  private readonly logger = new Logger(AdminV2VerificationSlaService.name);
  private breachedConsumerIds = new Set<string>();
  private lastComputedAt: Date | null = null;

  constructor(private readonly query: AdminV2VerificationQuery) {}

  async onModuleInit() {
    await this.refreshBreaches();
  }

  @Cron(`*/5 * * * *`)
  async refreshBreaches(): Promise<void> {
    try {
      const now = Date.now();
      const active = await this.query.listActiveVerificationSlaCandidates();
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
