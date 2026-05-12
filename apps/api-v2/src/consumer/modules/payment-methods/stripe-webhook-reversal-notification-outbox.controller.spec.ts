import { ForbiddenException } from '@nestjs/common';

import { StripeWebhookReversalNotificationOutboxController } from './stripe-webhook-reversal-notification-outbox.controller';
import { envs } from '../../../envs';

describe(`StripeWebhookReversalNotificationOutboxController`, () => {
  it(`rejects drain requests without the cron bearer secret`, async () => {
    const outbox = {
      processDueRows: jest.fn().mockResolvedValue({ claimed: 0, sent: 0, failed: 0 }),
    };
    const controller = new StripeWebhookReversalNotificationOutboxController(outbox as any);

    await expect(controller.drain(`Bearer wrong-secret`)).rejects.toBeInstanceOf(ForbiddenException);
    expect(outbox.processDueRows).not.toHaveBeenCalled();
  });

  it(`drains due rows with the cron bearer secret`, async () => {
    const result = { claimed: 1, sent: 1, failed: 0 };
    const outbox = {
      processDueRows: jest.fn().mockResolvedValue(result),
    };
    const controller = new StripeWebhookReversalNotificationOutboxController(outbox as any);

    await expect(controller.drain(`Bearer ${envs.CRON_SECRET}`)).resolves.toBe(result);
    expect(outbox.processDueRows).toHaveBeenCalledTimes(1);
  });
});
