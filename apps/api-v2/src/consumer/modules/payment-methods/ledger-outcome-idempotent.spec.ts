import { type Logger } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { createOutcomeIdempotent, type CreateOutcomeIdempotentData } from './ledger-outcome-idempotent';

describe(`createOutcomeIdempotent`, () => {
  const ledgerEntryId = `le-1`;
  const data: CreateOutcomeIdempotentData = {
    ledgerEntryId,
    status: `COMPLETED` as const,
    source: `stripe`,
    externalId: `ext-1`,
  };

  function makeClient(create: jest.Mock) {
    return {
      ledgerEntryOutcomeModel: { create },
    } as Parameters<typeof createOutcomeIdempotent>[0];
  }

  function makeKnownRequestError(
    code: string,
    target?: string | string[],
  ): Prisma.PrismaClientKnownRequestError & { meta?: { target?: unknown } } {
    const error = new Prisma.PrismaClientKnownRequestError(`Prisma error`, {
      code,
      clientVersion: `6.x`,
    }) as Prisma.PrismaClientKnownRequestError & { meta?: { target?: unknown } };
    if (target !== undefined) {
      error.meta = { target };
    }
    return error;
  }

  it(`calls create once and does not throw on success`, async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const client = makeClient(create);

    await expect(createOutcomeIdempotent(client, data)).resolves.toBeUndefined();

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        ledgerEntry: { connect: { id: ledgerEntryId } },
        status: data.status,
        source: data.source,
        externalId: data.externalId,
      },
    });
  });

  it(`on P2002 returns without throwing (idempotent skip)`, async () => {
    const create = jest.fn().mockRejectedValue(makeKnownRequestError(`P2002`, [`ledger_entry_id`, `external_id`]));
    const client = makeClient(create);
    const logger = { debug: jest.fn() } as unknown as Logger;

    await expect(createOutcomeIdempotent(client, data, logger)).resolves.toBeUndefined();

    expect(create).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(`Ledger outcome already recorded (idempotent skip)`);
  });

  it(`on P2002 without logger does not throw`, async () => {
    const create = jest
      .fn()
      .mockRejectedValue(makeKnownRequestError(`P2002`, `idx_ledger_entry_outcome_ledger_entry_external`));
    const client = makeClient(create);

    await expect(createOutcomeIdempotent(client, data)).resolves.toBeUndefined();
  });

  it(`on other error rethrows`, async () => {
    const otherError = new Error(`Connection refused`);
    const create = jest.fn().mockRejectedValue(otherError);
    const client = makeClient(create);

    await expect(createOutcomeIdempotent(client, data)).rejects.toThrow(otherError);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it(`on other Prisma code rethrows`, async () => {
    const create = jest.fn().mockRejectedValue(makeKnownRequestError(`P2025`));
    const client = makeClient(create);

    await expect(createOutcomeIdempotent(client, data)).rejects.toMatchObject({
      code: `P2025`,
    });
  });

  it(`rethrows P2002 when unique target is unrelated`, async () => {
    const create = jest.fn().mockRejectedValue(makeKnownRequestError(`P2002`, [`some_other_unique`]));
    const client = makeClient(create);

    await expect(createOutcomeIdempotent(client, data)).rejects.toMatchObject({
      code: `P2002`,
    });
  });
});
