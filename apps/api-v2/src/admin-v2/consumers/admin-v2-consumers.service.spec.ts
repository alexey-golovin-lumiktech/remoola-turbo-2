import { BadRequestException } from '@nestjs/common';

import { AdminV2ConsumersService } from './admin-v2-consumers.service';

type NoteRow = {
  id: string;
  consumerId: string;
  adminId: string;
  content: string;
  createdAt: Date;
};

type FlagRow = {
  id: string;
  consumerId: string;
  adminId: string;
  flag: string;
  reason: string | null;
  version: number;
  createdAt: Date;
  removedAt: Date | null;
  removedBy: string | null;
};

type AuditRow = {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
};

type TestState = {
  notes: NoteRow[];
  flags: FlagRow[];
  audits: AuditRow[];
};

type TestConsumerState = {
  id: string;
  email: string;
  suspendedAt: Date | null;
  suspendedBy: string | null;
  suspensionReason: string | null;
};

function cloneState(state: TestState): TestState {
  return {
    notes: state.notes.map((note) => ({
      ...note,
      createdAt: new Date(note.createdAt),
    })),
    flags: state.flags.map((flag) => ({
      ...flag,
      createdAt: new Date(flag.createdAt),
      removedAt: flag.removedAt ? new Date(flag.removedAt) : null,
    })),
    audits: state.audits.map((audit) => ({
      ...audit,
      metadata: audit.metadata ? { ...audit.metadata } : null,
    })),
  };
}

function projectSelection<T extends Record<string, unknown>>(row: T, select?: Record<string, boolean>) {
  if (!select) {
    return row;
  }

  return Object.fromEntries(Object.keys(select).map((key) => [key, row[key]]));
}

function matchesFlag(
  flag: FlagRow,
  where: { id?: string; consumerId?: string; flag?: string; removedAt?: null | Date | Record<string, unknown> },
) {
  if (where.id && flag.id !== where.id) {
    return false;
  }
  if (where.consumerId && flag.consumerId !== where.consumerId) {
    return false;
  }
  if (where.flag && flag.flag !== where.flag) {
    return false;
  }
  if (where.removedAt === null && flag.removedAt !== null) {
    return false;
  }
  return true;
}

describe(`AdminV2ConsumersService`, () => {
  function buildService(initialState?: Partial<TestState> & { consumer?: Partial<TestConsumerState> }) {
    const consumerState = {
      id: `consumer-1`,
      email: `consumer@example.com`,
      suspendedAt: null as Date | null,
      suspendedBy: null as string | null,
      suspensionReason: null as string | null,
      ...initialState?.consumer,
    };
    let state = cloneState({
      notes: initialState?.notes ?? [],
      flags: initialState?.flags ?? [],
      audits: initialState?.audits ?? [],
    });
    const controls = {
      failNextAuditCreate: false,
    };

    function createModels(getState: () => TestState) {
      return {
        consumerAdminNoteModel: {
          create: jest.fn(async ({ data, select }) => {
            const row: NoteRow = {
              id: `note-${getState().notes.length + 1}`,
              consumerId: data.consumerId,
              adminId: data.adminId,
              content: data.content,
              createdAt: new Date(),
            };
            getState().notes.push(row);
            return projectSelection(row as unknown as Record<string, unknown>, select);
          }),
        },
        consumerFlagModel: {
          findFirst: jest.fn(async ({ where, select }) => {
            const row = getState().flags.find((flag) => matchesFlag(flag, where)) ?? null;
            return row ? projectSelection(row as unknown as Record<string, unknown>, select) : null;
          }),
          create: jest.fn(async ({ data, select }) => {
            const row: FlagRow = {
              id: `flag-${getState().flags.length + 1}`,
              consumerId: data.consumerId,
              adminId: data.adminId,
              flag: data.flag,
              reason: data.reason ?? null,
              version: 1,
              createdAt: new Date(),
              removedAt: null,
              removedBy: null,
            };
            getState().flags.push(row);
            return projectSelection(row as unknown as Record<string, unknown>, select);
          }),
          update: jest.fn(async ({ where, data, select }) => {
            const row = getState().flags.find((flag) => flag.id === where.id);
            if (!row) {
              throw new Error(`Flag not found`);
            }
            row.removedAt = data.removedAt;
            row.removedBy = data.removedBy;
            row.version += data.version.increment;
            return projectSelection(row as unknown as Record<string, unknown>, select);
          }),
        },
        adminActionAuditLogModel: {
          create: jest.fn(async ({ data }) => {
            if (controls.failNextAuditCreate) {
              controls.failNextAuditCreate = false;
              throw new Error(`Audit insert failed`);
            }
            const row: AuditRow = {
              id: `audit-${getState().audits.length + 1}`,
              adminId: data.adminId,
              action: data.action,
              resource: data.resource,
              resourceId: data.resourceId ?? null,
              metadata: (data.metadata as Record<string, unknown> | null | undefined) ?? null,
              ipAddress: data.ipAddress ?? null,
              userAgent: data.userAgent ?? null,
            };
            getState().audits.push(row);
            return row;
          }),
        },
      };
    }

    const prisma = {
      consumerModel: {
        findUnique: jest.fn(async () => ({ ...consumerState })),
        update: jest.fn(async () => undefined),
        updateMany: jest.fn(async ({ where, data }) => {
          if (where.id !== consumerState.id) {
            return { count: 0 };
          }
          if (where.suspendedAt === null && consumerState.suspendedAt !== null) {
            return { count: 0 };
          }
          consumerState.suspendedAt = data.suspendedAt;
          consumerState.suspendedBy = data.suspendedBy;
          consumerState.suspensionReason = data.suspensionReason;
          return { count: 1 };
        }),
      },
      authSessionModel: {
        count: jest.fn(async () => 0),
      },
      ...createModels(() => state),
      $transaction: jest.fn(async (callback: (tx: ReturnType<typeof createModels>) => Promise<unknown>) => {
        const txState = cloneState(state);
        const result = await callback(createModels(() => txState));
        state = txState;
        return result;
      }),
    };
    const consumerContractsService = {
      getContracts: jest.fn(),
    };
    const adminActionAudit = {
      record: jest.fn(async () => undefined),
    };
    const consumerAuthService = {
      revokeAllSessionsByConsumerIdAndAudit: jest.fn(async () => undefined),
      sendConsumerSuspensionEmail: jest.fn(async () => true),
      resendSignupVerificationEmail: jest.fn(async () => true),
      resendPasswordRecoveryEmail: jest.fn(async () => ({
        requestedKind: `password_recovery`,
        dispatchedKind: `password_reset`,
      })),
    };
    const idempotency = {
      execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
    };

    return {
      service: new AdminV2ConsumersService(
        prisma as never,
        consumerContractsService as never,
        adminActionAudit as never,
        consumerAuthService as never,
        idempotency as never,
      ),
      prisma,
      adminActionAudit,
      consumerAuthService,
      idempotency,
      getState: () => cloneState(state),
      getConsumerState: () => ({ ...consumerState }),
      failNextAuditCreate: () => {
        controls.failNextAuditCreate = true;
      },
    };
  }

  it(`creates note and audit atomically`, async () => {
    const { service, getState, prisma } = buildService();

    const result = await service.createNote(`consumer-1`, `admin-1`, `  review this payout trail  `, {
      ipAddress: `127.0.0.1`,
      userAgent: `jest`,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: `note-1`,
      content: `review this payout trail`,
      createdAt: expect.any(Date),
    });
    expect(getState()).toEqual({
      notes: [
        expect.objectContaining({
          id: `note-1`,
          consumerId: `consumer-1`,
          adminId: `admin-1`,
          content: `review this payout trail`,
        }),
      ],
      flags: [],
      audits: [
        expect.objectContaining({
          id: `audit-1`,
          action: `consumer_note_create`,
          resource: `consumer`,
          resourceId: `consumer-1`,
          metadata: { noteId: `note-1` },
          ipAddress: `127.0.0.1`,
          userAgent: `jest`,
        }),
      ],
    });
  });

  it(`rolls back note creation if audit insert fails`, async () => {
    const { service, getState, failNextAuditCreate } = buildService();
    failNextAuditCreate();

    await expect(service.createNote(`consumer-1`, `admin-1`, `strict audit first`)).rejects.toThrow(
      `Audit insert failed`,
    );

    expect(getState()).toEqual({
      notes: [],
      flags: [],
      audits: [],
    });
  });

  it(`preserves note and flag validation behavior`, async () => {
    const { service } = buildService();

    await expect(service.createNote(`consumer-1`, `admin-1`, `   `)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.addFlag(`consumer-1`, `admin-1`, `!!!`, null)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.removeFlag(`consumer-1`, `flag-1`, `admin-1`, 0)).rejects.toBeInstanceOf(BadRequestException);
  });

  it(`creates flag and audit atomically`, async () => {
    const { service, getState, prisma } = buildService();

    const result = await service.addFlag(`consumer-1`, `admin-1`, ` Needs Review `, ` operator note `, {
      ipAddress: `127.0.0.1`,
      userAgent: `jest`,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: `flag-1`,
      flag: `needs_review`,
      reason: `operator note`,
      version: 1,
      createdAt: expect.any(Date),
    });
    expect(getState()).toEqual({
      notes: [],
      flags: [
        expect.objectContaining({
          id: `flag-1`,
          consumerId: `consumer-1`,
          adminId: `admin-1`,
          flag: `needs_review`,
          reason: `operator note`,
          version: 1,
          removedAt: null,
          removedBy: null,
        }),
      ],
      audits: [
        expect.objectContaining({
          id: `audit-1`,
          action: `consumer_flag_add`,
          resource: `consumer`,
          resourceId: `consumer-1`,
          metadata: {
            flagId: `flag-1`,
            flag: `needs_review`,
            reason: `operator note`,
          },
        }),
      ],
    });
  });

  it(`returns existing active flag without writing a duplicate audit`, async () => {
    const { service, getState, prisma } = buildService({
      flags: [
        {
          id: `flag-1`,
          consumerId: `consumer-1`,
          adminId: `admin-9`,
          flag: `needs_review`,
          reason: `existing reason`,
          version: 3,
          createdAt: new Date(`2026-04-16T09:00:00.000Z`),
          removedAt: null,
          removedBy: null,
        },
      ],
    });

    const result = await service.addFlag(`consumer-1`, `admin-1`, `Needs Review`, `new reason`);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: `flag-1`,
      flag: `needs_review`,
      reason: `existing reason`,
      version: 3,
      createdAt: new Date(`2026-04-16T09:00:00.000Z`),
      alreadyExisted: true,
    });
    expect(getState().audits).toEqual([]);
  });

  it(`rolls back flag creation if audit insert fails`, async () => {
    const { service, getState, failNextAuditCreate } = buildService();
    failNextAuditCreate();

    await expect(service.addFlag(`consumer-1`, `admin-1`, `Needs Review`, `reason`)).rejects.toThrow(
      `Audit insert failed`,
    );

    expect(getState()).toEqual({
      notes: [],
      flags: [],
      audits: [],
    });
  });

  it(`soft removes flag and writes audit atomically`, async () => {
    const { service, getState, prisma } = buildService({
      flags: [
        {
          id: `flag-1`,
          consumerId: `consumer-1`,
          adminId: `admin-9`,
          flag: `needs_review`,
          reason: `existing reason`,
          version: 1,
          createdAt: new Date(`2026-04-16T09:00:00.000Z`),
          removedAt: null,
          removedBy: null,
        },
      ],
    });

    const result = await service.removeFlag(`consumer-1`, `flag-1`, `admin-1`, 1, {
      ipAddress: `127.0.0.1`,
      userAgent: `jest`,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: `flag-1`,
      flag: `needs_review`,
      version: 2,
      removedAt: expect.any(Date),
    });
    const state = getState();
    expect(state.flags).toEqual([
      expect.objectContaining({
        id: `flag-1`,
        removedBy: `admin-1`,
        version: 2,
      }),
    ]);
    expect(state.flags[0]?.removedAt).toBeInstanceOf(Date);
    expect(state.audits).toEqual([
      expect.objectContaining({
        action: `consumer_flag_remove`,
        resource: `consumer`,
        resourceId: `consumer-1`,
        metadata: expect.objectContaining({
          flagId: `flag-1`,
          flag: `needs_review`,
        }),
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
      }),
    ]);
  });

  it(`returns already removed flag without creating a second audit row`, async () => {
    const removedAt = new Date(`2026-04-16T10:00:00.000Z`);
    const { service, getState, prisma } = buildService({
      flags: [
        {
          id: `flag-1`,
          consumerId: `consumer-1`,
          adminId: `admin-9`,
          flag: `needs_review`,
          reason: `existing reason`,
          version: 2,
          createdAt: new Date(`2026-04-16T09:00:00.000Z`),
          removedAt,
          removedBy: `admin-7`,
        },
      ],
    });

    const result = await service.removeFlag(`consumer-1`, `flag-1`, `admin-1`, 2);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: `flag-1`,
      alreadyRemoved: true,
    });
    expect(getState().audits).toEqual([]);
  });

  it(`rolls back flag removal if audit insert fails`, async () => {
    const { service, getState, failNextAuditCreate } = buildService({
      flags: [
        {
          id: `flag-1`,
          consumerId: `consumer-1`,
          adminId: `admin-9`,
          flag: `needs_review`,
          reason: `existing reason`,
          version: 1,
          createdAt: new Date(`2026-04-16T09:00:00.000Z`),
          removedAt: null,
          removedBy: null,
        },
      ],
    });
    failNextAuditCreate();

    await expect(service.removeFlag(`consumer-1`, `flag-1`, `admin-1`, 1)).rejects.toThrow(`Audit insert failed`);

    expect(getState()).toEqual({
      notes: [],
      flags: [
        {
          id: `flag-1`,
          consumerId: `consumer-1`,
          adminId: `admin-9`,
          flag: `needs_review`,
          reason: `existing reason`,
          version: 1,
          createdAt: new Date(`2026-04-16T09:00:00.000Z`),
          removedAt: null,
          removedBy: null,
        },
      ],
      audits: [],
    });
  });

  it(`requires confirmation and reason for consumer suspension`, async () => {
    const { service } = buildService();

    await expect(
      service.suspendConsumer(`consumer-1`, `admin-1`, { confirmed: false, reason: `risk` }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.suspendConsumer(`consumer-1`, `admin-1`, { confirmed: true, reason: ` ` }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it(`routes consumer suspension through admin-v2 idempotency with exact scope`, async () => {
    const { service, idempotency, adminActionAudit, consumerAuthService } = buildService();

    const result = await service.suspendConsumer(
      `consumer-1`,
      `admin-1`,
      { confirmed: true, reason: `Regulatory block` },
      { idempotencyKey: `idem-1` },
    );

    expect(idempotency.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `consumer-suspend:consumer-1`,
        key: `idem-1`,
        payload: {
          consumerId: `consumer-1`,
          confirmed: true,
          reason: `Regulatory block`,
        },
      }),
    );
    expect(consumerAuthService.sendConsumerSuspensionEmail).toHaveBeenCalledWith(`consumer-1`, `Regulatory block`);
    expect(adminActionAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: `consumer_suspend`,
        resource: `consumer`,
        resourceId: `consumer-1`,
        metadata: expect.objectContaining({
          emailDispatched: true,
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        consumerId: `consumer-1`,
        alreadySuspended: false,
        emailDispatched: true,
      }),
    );
  });

  it(`returns alreadySuspended without duplicate revoke or email side effects`, async () => {
    const suspendedAt = new Date(`2026-04-24T09:00:00.000Z`);
    const { service, consumerAuthService, adminActionAudit, getConsumerState } = buildService({
      consumer: {
        id: `consumer-1`,
        email: `consumer@example.com`,
        suspendedAt,
        suspendedBy: `admin-9`,
        suspensionReason: `Existing block`,
      },
    });

    const result = await service.suspendConsumer(`consumer-1`, `admin-1`, {
      confirmed: true,
      reason: `Regulatory block`,
    });

    expect(result).toEqual({
      consumerId: `consumer-1`,
      suspendedAt,
      alreadySuspended: true,
      emailDispatched: false,
    });
    expect(getConsumerState().suspendedAt).toEqual(suspendedAt);
    expect(consumerAuthService.revokeAllSessionsByConsumerIdAndAudit).not.toHaveBeenCalled();
    expect(consumerAuthService.sendConsumerSuspensionEmail).not.toHaveBeenCalled();
    expect(adminActionAudit.record).not.toHaveBeenCalled();
  });

  it(`keeps suspension successful when notification dispatch fails after state change`, async () => {
    const { service, consumerAuthService, adminActionAudit, getConsumerState } = buildService();
    consumerAuthService.sendConsumerSuspensionEmail = jest.fn(async () => false);

    const result = await service.suspendConsumer(`consumer-1`, `admin-1`, {
      confirmed: true,
      reason: `Regulatory block`,
    });

    expect(result).toEqual(
      expect.objectContaining({
        consumerId: `consumer-1`,
        alreadySuspended: false,
        emailDispatched: false,
      }),
    );
    expect(getConsumerState()).toEqual(
      expect.objectContaining({
        suspendedBy: `admin-1`,
        suspensionReason: `Regulatory block`,
        suspendedAt: expect.any(Date),
      }),
    );
    expect(consumerAuthService.revokeAllSessionsByConsumerIdAndAudit).toHaveBeenCalledTimes(1);
    expect(adminActionAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: `consumer_suspend`,
        metadata: expect.objectContaining({
          emailDispatched: false,
        }),
      }),
    );
  });

  it(`records explicit email resend metadata without generic mail affordances`, async () => {
    const { service, adminActionAudit, idempotency } = buildService();

    const result = await service.resendConsumerEmail(
      `consumer-1`,
      `admin-1`,
      { emailKind: `password_recovery`, appScope: `consumer-css-grid` },
      { ipAddress: `127.0.0.1`, userAgent: `jest`, idempotencyKey: `email-idem-1` },
    );

    expect(idempotency.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `consumer-email-resend:consumer-1:password_recovery:consumer-css-grid`,
        key: `email-idem-1`,
        payload: {
          consumerId: `consumer-1`,
          requestedEmailKind: `password_recovery`,
          appScope: `consumer-css-grid`,
        },
      }),
    );
    expect(adminActionAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: `consumer_email_resend`,
        metadata: expect.objectContaining({
          requestedEmailKind: `password_recovery`,
          dispatchedEmailKind: `password_reset`,
          appScope: `consumer-css-grid`,
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        consumerId: `consumer-1`,
        requestedKind: `password_recovery`,
        dispatchedKind: `password_reset`,
        emailDispatched: true,
      }),
    );
  });
});
