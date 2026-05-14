import { $Enums } from '@remoola/database-2';

import { ConsumerExchangeAutomationRepository } from './consumer-exchange-automation.repository';

describe(`ConsumerExchangeAutomationRepository`, () => {
  it(`claims a manual rule run using the previously read nextRunAt value`, async () => {
    const prisma = {
      walletAutoConversionRuleModel: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const repository = new ConsumerExchangeAutomationRepository(prisma);
    const now = new Date(`2026-05-14T12:00:00.000Z`);
    const nextRunAt = new Date(`2026-05-14T11:30:00.000Z`);

    const claimed = await repository.claimAutoConversionRuleNow({
      ruleId: `rule-1`,
      now,
      minIntervalMinutes: 30,
      expectedNextRunAt: nextRunAt,
    });

    expect(claimed).toBe(true);
    expect(prisma.walletAutoConversionRuleModel.updateMany).toHaveBeenCalledWith({
      where: {
        id: `rule-1`,
        deletedAt: null,
        nextRunAt,
      },
      data: {
        lastRunAt: now,
        nextRunAt: new Date(now.getTime() + 30 * 60 * 1000),
      },
    });
  });

  it(`claims due scheduled conversions by moving them to processing`, async () => {
    const prisma = {
      scheduledFxConversionModel: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const repository = new ConsumerExchangeAutomationRepository(prisma);

    const claimed = await repository.claimDueScheduledConversion(`conversion-1`);

    expect(claimed).toBe(true);
    expect(prisma.scheduledFxConversionModel.updateMany).toHaveBeenCalledWith({
      where: {
        id: `conversion-1`,
        status: $Enums.ScheduledFxConversionStatus.PENDING,
        deletedAt: null,
      },
      data: {
        status: $Enums.ScheduledFxConversionStatus.PROCESSING,
        processingAt: expect.any(Date),
        attempts: { increment: 1 },
      },
    });
  });

  it(`reschedules failed auto rules with new metadata`, async () => {
    const prisma = {
      walletAutoConversionRuleModel: {
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;
    const repository = new ConsumerExchangeAutomationRepository(prisma);
    const nextRunAt = new Date(`2026-05-14T12:05:00.000Z`);
    const metadata = {
      lastExecution: {
        status: `failed`,
        reason: `boom`,
      },
    };

    await repository.rescheduleAutoConversionRuleFailure(`rule-1`, nextRunAt, metadata);

    expect(prisma.walletAutoConversionRuleModel.update).toHaveBeenCalledWith({
      where: { id: `rule-1` },
      data: {
        nextRunAt,
        metadata,
      },
    });
  });
});
