import { $Enums, Prisma } from '@remoola/database-2';

import { ConsumerPaymentsLedgerRepository } from './consumer-payments-ledger.repository';
import { type PrismaService } from '../../../shared/prisma.service';

describe(`ConsumerPaymentsLedgerRepository`, () => {
  function makeRepository() {
    const prisma = {
      ledgerEntryModel: {
        findFirst: jest.fn(async (_args: unknown) => null),
        create: jest.fn(async (_args: unknown) => null),
      },
    };
    return {
      prisma,
      repository: new ConsumerPaymentsLedgerRepository(prisma as unknown as PrismaService),
    };
  }

  describe(`findExistingWithdrawByIdempotencyKey`, () => {
    it(`looks up a USER_PAYOUT entry by the prefixed idempotency key`, async () => {
      const { prisma, repository } = makeRepository();
      await repository.findExistingWithdrawByIdempotencyKey(`consumer-1`, `key-42`);
      expect(prisma.ledgerEntryModel.findFirst).toHaveBeenCalledWith({
        where: {
          idempotencyKey: `withdraw:key-42`,
          consumerId: `consumer-1`,
          type: $Enums.LedgerEntryType.USER_PAYOUT,
          deletedAt: null,
        },
      });
    });
  });

  describe(`findExistingTransferByIdempotencyKey`, () => {
    it(`looks up the sender USER_PAYMENT entry and returns only ledgerId`, async () => {
      const { prisma, repository } = makeRepository();
      await repository.findExistingTransferByIdempotencyKey(`consumer-1`, `key-42`);
      expect(prisma.ledgerEntryModel.findFirst).toHaveBeenCalledWith({
        where: {
          idempotencyKey: `transfer:key-42:sender`,
          consumerId: `consumer-1`,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          deletedAt: null,
        },
        select: { ledgerId: true },
      });
    });
  });

  describe(`lockConsumerOutgoing`, () => {
    it(`acquires a transaction-scoped advisory lock keyed on the consumer outgoing namespace`, async () => {
      const { repository } = makeRepository();
      const executeRaw = jest.fn(async (_arg: unknown) => 0);
      await repository.lockConsumerOutgoing({ $executeRaw: executeRaw } as never, `consumer-1`);
      expect(executeRaw).toHaveBeenCalledTimes(1);
      const firstCallSql = executeRaw.mock.calls[0]?.[0] as Prisma.Sql;
      expect(firstCallSql.values).toContain(`consumer-1:outgoing`);
    });
  });

  describe(`createWithdrawLedgerEntry`, () => {
    function makeTx() {
      const ledgerEntryModel = { create: jest.fn(async (_args: unknown) => null) };
      return {
        tx: { $executeRaw: jest.fn(async (_arg: unknown) => 0), ledgerEntryModel },
        ledgerEntryModel,
      };
    }

    it(`writes a negated USER_PAYOUT entry in PENDING status with prefixed key`, async () => {
      const { tx, ledgerEntryModel } = makeTx();
      const { repository } = makeRepository();
      await repository.createWithdrawLedgerEntry(tx as never, {
        ledgerId: `ledger-1`,
        consumerId: `consumer-1`,
        currencyCode: $Enums.CurrencyCode.USD,
        amount: new Prisma.Decimal(`100.00`),
        idempotencyKey: `key-1`,
      });
      const args = ledgerEntryModel.create.mock.calls[0]?.[0] as {
        data: {
          amount: Prisma.Decimal;
          status: $Enums.TransactionStatus;
          type: $Enums.LedgerEntryType;
          idempotencyKey: string;
          metadata: Record<string, unknown>;
        };
      };
      expect(args.data.amount.toString()).toBe(`-100`);
      expect(args.data.status).toBe($Enums.TransactionStatus.PENDING);
      expect(args.data.type).toBe($Enums.LedgerEntryType.USER_PAYOUT);
      expect(args.data.idempotencyKey).toBe(`withdraw:key-1`);
      expect(args.data.metadata).toEqual({
        rail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: `consumer-1`,
      });
    });

    it(`includes paymentMethodId and note in metadata only when non-empty after trim`, async () => {
      const { tx, ledgerEntryModel } = makeTx();
      const { repository } = makeRepository();
      await repository.createWithdrawLedgerEntry(tx as never, {
        ledgerId: `ledger-1`,
        consumerId: `consumer-1`,
        currencyCode: $Enums.CurrencyCode.USD,
        amount: new Prisma.Decimal(`10.00`),
        idempotencyKey: `key-2`,
        paymentMethodId: `  pm-1  `,
        note: `  hello  `,
      });
      const args = ledgerEntryModel.create.mock.calls[0]?.[0] as {
        data: { metadata: Record<string, unknown> };
      };
      expect(args.data.metadata).toEqual({
        rail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: `consumer-1`,
        paymentMethodId: `pm-1`,
        note: `hello`,
      });
    });

    it(`drops blank paymentMethodId and note from metadata`, async () => {
      const { tx, ledgerEntryModel } = makeTx();
      const { repository } = makeRepository();
      await repository.createWithdrawLedgerEntry(tx as never, {
        ledgerId: `ledger-1`,
        consumerId: `consumer-1`,
        currencyCode: $Enums.CurrencyCode.USD,
        amount: new Prisma.Decimal(`10.00`),
        idempotencyKey: `key-3`,
        paymentMethodId: `   `,
        note: ``,
      });
      const args = ledgerEntryModel.create.mock.calls[0]?.[0] as {
        data: { metadata: Record<string, unknown> };
      };
      expect(args.data.metadata).not.toHaveProperty(`paymentMethodId`);
      expect(args.data.metadata).not.toHaveProperty(`note`);
    });
  });

  describe(`createTransferLedgerEntries`, () => {
    it(`writes a negated sender entry and a positive recipient entry with paired idempotency keys`, async () => {
      const ledgerEntryModel = { create: jest.fn(async (_args: unknown) => null) };
      const tx = { $executeRaw: jest.fn(async (_arg: unknown) => 0), ledgerEntryModel };
      const { repository } = makeRepository();

      await repository.createTransferLedgerEntries(tx as never, {
        ledgerId: `ledger-1`,
        consumerId: `consumer-sender`,
        recipientId: `consumer-recipient`,
        currencyCode: $Enums.CurrencyCode.USD,
        amount: new Prisma.Decimal(`25.50`),
        idempotencyKey: `key-9`,
      });

      expect(ledgerEntryModel.create).toHaveBeenCalledTimes(2);
      const sender = ledgerEntryModel.create.mock.calls[0]?.[0] as {
        data: {
          consumerId: string;
          amount: Prisma.Decimal;
          status: $Enums.TransactionStatus;
          idempotencyKey: string;
          metadata: Record<string, unknown>;
        };
      };
      const recipient = ledgerEntryModel.create.mock.calls[1]?.[0] as {
        data: {
          consumerId: string;
          amount: Prisma.Decimal;
          status: $Enums.TransactionStatus;
          idempotencyKey: string;
        };
      };

      expect(sender.data.consumerId).toBe(`consumer-sender`);
      expect(sender.data.amount.toString()).toBe(`-25.5`);
      expect(sender.data.status).toBe($Enums.TransactionStatus.COMPLETED);
      expect(sender.data.idempotencyKey).toBe(`transfer:key-9:sender`);
      expect(sender.data.metadata).toEqual({
        rail: $Enums.PaymentRail.BANK_TRANSFER,
        senderId: `consumer-sender`,
        recipientId: `consumer-recipient`,
      });

      expect(recipient.data.consumerId).toBe(`consumer-recipient`);
      expect(recipient.data.amount.toString()).toBe(`25.5`);
      expect(recipient.data.status).toBe($Enums.TransactionStatus.COMPLETED);
      expect(recipient.data.idempotencyKey).toBe(`transfer:key-9:recipient`);
    });
  });
});
