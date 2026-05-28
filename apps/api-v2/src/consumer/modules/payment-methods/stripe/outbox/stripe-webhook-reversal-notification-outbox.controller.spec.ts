import { describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';

import { StripeWebhookReversalNotificationOutboxController } from './stripe-webhook-reversal-notification-outbox.controller'; // eslint-disable-line max-len
import { envs } from '../../../../../envs';

describe(`StripeWebhookReversalNotificationOutboxController`, () => {
  it(`rejects drain requests without the cron bearer secret`, async () => {
    const outbox = {
      processDueRows: jest.fn<(...a: any[]) => any>().mockResolvedValue({ claimed: 0, sent: 0, failed: 0 }),
    };
    const controller = new StripeWebhookReversalNotificationOutboxController(outbox as any);

    await expect(controller.drain(`Bearer wrong-secret`)).rejects.toBeInstanceOf(ForbiddenException);
    expect(outbox.processDueRows).not.toHaveBeenCalled();
  });

  it(`drains due rows with the cron bearer secret`, async () => {
    const result = { claimed: 1, sent: 1, failed: 0 };
    const outbox = {
      processDueRows: jest.fn<(...a: any[]) => any>().mockResolvedValue(result),
    };
    const controller = new StripeWebhookReversalNotificationOutboxController(outbox as any);

    await expect(controller.drain(`Bearer ${envs.CRON_SECRET}`)).resolves.toBe(result);
    expect(outbox.processDueRows).toHaveBeenCalledTimes(1);
    expect(outbox.processDueRows).toHaveBeenCalledWith();
  });

  it(`passes bounded drain limit to the outbox service`, async () => {
    const result = { claimed: 1, sent: 1, failed: 0 };
    const outbox = {
      processDueRows: jest.fn<(...a: any[]) => any>().mockResolvedValue(result),
    };
    const controller = new StripeWebhookReversalNotificationOutboxController(outbox as any);

    await expect(controller.drain(`Bearer ${envs.CRON_SECRET}`, `5`)).resolves.toBe(result);
    expect(outbox.processDueRows).toHaveBeenCalledWith(5);
  });

  it(`clamps drain limit to the supported range`, async () => {
    const result = { claimed: 0, sent: 0, failed: 0 };
    const outbox = {
      processDueRows: jest.fn<(...a: any[]) => any>().mockResolvedValue(result),
    };
    const controller = new StripeWebhookReversalNotificationOutboxController(outbox as any);

    await expect(controller.drain(`Bearer ${envs.CRON_SECRET}`, `100`)).resolves.toBe(result);
    await expect(controller.drain(`Bearer ${envs.CRON_SECRET}`, `0`)).resolves.toBe(result);

    expect(outbox.processDueRows).toHaveBeenNthCalledWith(1, 25);
    expect(outbox.processDueRows).toHaveBeenNthCalledWith(2, 1);
  });

  it(`uses default outbox limit for invalid limit values`, async () => {
    const result = { claimed: 0, sent: 0, failed: 0 };
    const outbox = {
      processDueRows: jest.fn<(...a: any[]) => any>().mockResolvedValue(result),
    };
    const controller = new StripeWebhookReversalNotificationOutboxController(outbox as any);

    await expect(controller.drain(`Bearer ${envs.CRON_SECRET}`, `not-a-number`)).resolves.toBe(result);
    expect(outbox.processDueRows).toHaveBeenCalledWith();
  });
});
