import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import {
  assertSavedViewWorkspace,
  isSavedViewWorkspace,
  MAX_SAVED_VIEW_PAYLOAD_BYTES,
} from './admin-v2-saved-views.dto';
import { AdminV2SavedViewsService, type SavedViewActorContext } from './admin-v2-saved-views.service';

const OPS_ADMIN_ID = `11111111-1111-4111-8111-111111111111`;
const OTHER_ADMIN_ID = `22222222-2222-4222-8222-222222222222`;
const SAVED_VIEW_ID = `33333333-3333-4333-8333-333333333333`;

const opsActor: SavedViewActorContext = { id: OPS_ADMIN_ID, email: `ops@example.com`, type: `ADMIN` };

type SavedViewModelRow = {
  id: string;
  ownerId: string;
  workspace: string;
  name: string;
  description: string | null;
  queryPayload: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function activeRow(overrides: Partial<SavedViewModelRow> = {}): SavedViewModelRow {
  return {
    id: SAVED_VIEW_ID,
    ownerId: OPS_ADMIN_ID,
    workspace: `ledger_anomalies`,
    name: `My view`,
    description: null,
    queryPayload: { class: `STALE_PENDING`, dateFrom: `2026-04-01`, dateTo: `2026-04-30` },
    createdAt: new Date(`2026-04-21T10:00:00.000Z`),
    updatedAt: new Date(`2026-04-21T10:00:00.000Z`),
    deletedAt: null,
    ...overrides,
  };
}

function buildService() {
  const savedViewModel = {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const queryRaw = jest.fn();
  const transactionTx = {
    savedViewModel,
    $queryRaw: queryRaw,
  };
  const prisma = {
    savedViewModel,
    $queryRaw: queryRaw,
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(transactionTx)),
  };
  const idempotency = {
    execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
  };
  const adminActionAudit = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  const service = new AdminV2SavedViewsService(prisma as never, idempotency as never, adminActionAudit as never);

  return { service, prisma, savedViewModel, queryRaw, idempotency, adminActionAudit };
}

const meta = {
  ipAddress: `127.0.0.1`,
  userAgent: `jest`,
  idempotencyKey: `idem-1`,
};

describe(`AdminV2SavedViewsService`, () => {
  describe(`allowlist`, () => {
    it(`accepts ledger_anomalies`, () => {
      expect(isSavedViewWorkspace(`ledger_anomalies`)).toBe(true);
      expect(() => assertSavedViewWorkspace(`ledger_anomalies`)).not.toThrow();
    });

    it(`accepts verification_queue`, () => {
      expect(isSavedViewWorkspace(`verification_queue`)).toBe(true);
      expect(() => assertSavedViewWorkspace(`verification_queue`)).not.toThrow();
    });

    it(`rejects shell_quickstarts_verification`, () => {
      expect(isSavedViewWorkspace(`shell_quickstarts_verification`)).toBe(false);
      expect(() => assertSavedViewWorkspace(`shell_quickstarts_verification`)).toThrow(BadRequestException);
    });

    it(`rejects shell_unknown`, () => {
      expect(isSavedViewWorkspace(`shell_unknown`)).toBe(false);
      expect(() => assertSavedViewWorkspace(`shell_unknown`)).toThrow(BadRequestException);
    });
  });

  describe(`list`, () => {
    it(`returns own active views for the workspace sorted by name`, async () => {
      const { service, savedViewModel } = buildService();
      const a = activeRow({ id: `a`, name: `Alpha` });
      const b = activeRow({ id: `b`, name: `Bravo` });
      savedViewModel.findMany.mockResolvedValueOnce([a, b]);

      const result = await service.list(opsActor, `ledger_anomalies`);

      expect(result.views).toHaveLength(2);
      expect(result.views[0]?.name).toBe(`Alpha`);
      expect(savedViewModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: OPS_ADMIN_ID, workspace: `ledger_anomalies`, deletedAt: null },
          orderBy: { name: `asc` },
          take: 200,
        }),
      );
    });

    it(`returns empty array when no views exist`, async () => {
      const { service, savedViewModel } = buildService();
      savedViewModel.findMany.mockResolvedValueOnce([]);

      const result = await service.list(opsActor, `ledger_anomalies`);

      expect(result).toEqual({ views: [] });
    });

    it(`rejects unknown workspace with 400`, async () => {
      const { service } = buildService();

      await expect(service.list(opsActor, `payments`)).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`enforces 200-row hard cap via take`, async () => {
      const { service, savedViewModel } = buildService();
      const rows = Array.from({ length: 200 }, (_, i) => activeRow({ id: `id-${i}`, name: `View ${i}` }));
      savedViewModel.findMany.mockResolvedValueOnce(rows);

      const result = await service.list(opsActor, `ledger_anomalies`);

      expect(result.views).toHaveLength(200);
      expect(savedViewModel.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
    });
  });

  describe(`create`, () => {
    it(`creates a row and records audit without payload in metadata`, async () => {
      const { service, savedViewModel, adminActionAudit } = buildService();
      savedViewModel.create.mockResolvedValueOnce(activeRow());

      const result = await service.create(
        opsActor,
        {
          workspace: `ledger_anomalies`,
          name: `My view`,
          description: `desc`,
          queryPayload: { class: `STALE_PENDING`, dateFrom: `2026-04-01`, dateTo: `2026-04-30` },
        },
        meta,
      );

      expect(result.id).toBe(SAVED_VIEW_ID);
      expect(savedViewModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: OPS_ADMIN_ID,
            workspace: `ledger_anomalies`,
            name: `My view`,
            description: `desc`,
          }),
        }),
      );
      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `saved_view_create`,
          resource: `saved_view`,
          resourceId: SAVED_VIEW_ID,
          metadata: expect.objectContaining({
            workspace: `ledger_anomalies`,
            name: `My view`,
            severity: `standard`,
            payloadBytes: expect.any(Number),
          }),
        }),
      );
      const auditCall = adminActionAudit.record.mock.calls[0]![0]!;
      expect(auditCall.metadata).not.toHaveProperty(`queryPayload`);
    });

    it(`maps Prisma P2002 to ConflictException`, async () => {
      const { service, savedViewModel } = buildService();
      savedViewModel.create.mockRejectedValueOnce(Object.assign(new Error(`unique`), { code: `P2002` }));

      await expect(
        service.create(opsActor, { workspace: `ledger_anomalies`, name: `Dup`, queryPayload: null }, meta),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(`succeeds when only collision is with soft-deleted row (Prisma decides via partial unique)`, async () => {
      const { service, savedViewModel } = buildService();
      savedViewModel.create.mockResolvedValueOnce(activeRow({ name: `Reused` }));

      const result = await service.create(
        opsActor,
        { workspace: `ledger_anomalies`, name: `Reused`, queryPayload: null },
        meta,
      );

      expect(result.name).toBe(`Reused`);
    });

    it(`rejects unknown workspace`, async () => {
      const { service } = buildService();

      await expect(
        service.create(opsActor, { workspace: `payments`, name: `n`, queryPayload: null }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects empty name (after trim)`, async () => {
      const { service } = buildService();

      await expect(
        service.create(opsActor, { workspace: `ledger_anomalies`, name: `   `, queryPayload: null }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects too long name (>100)`, async () => {
      const { service } = buildService();

      await expect(
        service.create(opsActor, { workspace: `ledger_anomalies`, name: `a`.repeat(101), queryPayload: null }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects too long description (>500)`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `n`,
            description: `a`.repeat(501),
            queryPayload: null,
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects payload exceeding the byte limit`, async () => {
      const { service } = buildService();
      const big = `x`.repeat(MAX_SAVED_VIEW_PAYLOAD_BYTES + 1);

      await expect(
        service.create(opsActor, { workspace: `ledger_anomalies`, name: `n`, queryPayload: { big } }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects primitive payload`, async () => {
      const { service } = buildService();

      await expect(
        service.create(opsActor, { workspace: `ledger_anomalies`, name: `n`, queryPayload: `string` as unknown }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects undefined payload`, async () => {
      const { service } = buildService();

      await expect(service.create(opsActor, { workspace: `ledger_anomalies`, name: `n` }, meta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it(`accepts null payload`, async () => {
      const { service, savedViewModel } = buildService();
      savedViewModel.create.mockResolvedValueOnce(activeRow({ queryPayload: null }));

      const result = await service.create(
        opsActor,
        { workspace: `ledger_anomalies`, name: `n`, queryPayload: null },
        meta,
      );

      expect(result.queryPayload).toBeNull();
    });

    it(`accepts array payload`, async () => {
      const { service, savedViewModel } = buildService();
      savedViewModel.create.mockResolvedValueOnce(activeRow({ queryPayload: [`a`, `b`] }));

      const result = await service.create(
        opsActor,
        { workspace: `ledger_anomalies`, name: `n`, queryPayload: [`a`, `b`] },
        meta,
      );

      expect(result.queryPayload).toEqual([`a`, `b`]);
    });

    it(`accepts payload exactly at the byte boundary`, async () => {
      const { service, savedViewModel } = buildService();
      savedViewModel.create.mockResolvedValueOnce(activeRow());
      const value = `x`.repeat(MAX_SAVED_VIEW_PAYLOAD_BYTES - 10);

      await service.create(opsActor, { workspace: `ledger_anomalies`, name: `n`, queryPayload: { v: value } }, meta);

      expect(savedViewModel.create).toHaveBeenCalled();
    });
  });

  describe(`update`, () => {
    function lockedRow(overrides: Partial<{ deleted_at: Date | null; owner_id: string; name: string }> = {}) {
      return [
        {
          id: SAVED_VIEW_ID,
          owner_id: OPS_ADMIN_ID,
          workspace: `ledger_anomalies`,
          name: `Old name`,
          deleted_at: null as Date | null,
          ...overrides,
        },
      ];
    }

    it(`updates name and records audit`, async () => {
      const { service, queryRaw, savedViewModel, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      savedViewModel.update.mockResolvedValueOnce(activeRow({ name: `New name` }));

      const result = await service.update(
        opsActor,
        SAVED_VIEW_ID,
        { name: `New name`, expectedDeletedAtNull: 0 },
        meta,
      );

      expect(result.name).toBe(`New name`);
      expect(savedViewModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SAVED_VIEW_ID },
          data: { name: `New name` },
        }),
      );
      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `saved_view_update`,
          resource: `saved_view`,
          resourceId: SAVED_VIEW_ID,
          metadata: expect.objectContaining({
            changedFields: [`name`],
            previousName: `Old name`,
          }),
        }),
      );
    });

    it(`updates queryPayload`, async () => {
      const { service, queryRaw, savedViewModel } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      savedViewModel.update.mockResolvedValueOnce(activeRow());

      await service.update(opsActor, SAVED_VIEW_ID, { queryPayload: { x: 1 }, expectedDeletedAtNull: 0 }, meta);

      expect(savedViewModel.update).toHaveBeenCalledWith(expect.objectContaining({ data: { queryPayload: { x: 1 } } }));
    });

    it(`updates description`, async () => {
      const { service, queryRaw, savedViewModel } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      savedViewModel.update.mockResolvedValueOnce(activeRow({ description: `desc` }));

      await service.update(opsActor, SAVED_VIEW_ID, { description: `desc`, expectedDeletedAtNull: 0 }, meta);

      expect(savedViewModel.update).toHaveBeenCalledWith(expect.objectContaining({ data: { description: `desc` } }));
    });

    it(`updates multiple fields in one call`, async () => {
      const { service, queryRaw, savedViewModel } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      savedViewModel.update.mockResolvedValueOnce(activeRow({ name: `New`, description: `D` }));

      await service.update(
        opsActor,
        SAVED_VIEW_ID,
        { name: `New`, description: `D`, queryPayload: null, expectedDeletedAtNull: 0 },
        meta,
      );

      expect(savedViewModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: `New`, description: `D`, queryPayload: null },
        }),
      );
    });

    it(`rejects empty body (no fields)`, async () => {
      const { service } = buildService();

      await expect(service.update(opsActor, SAVED_VIEW_ID, { expectedDeletedAtNull: 0 }, meta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it(`rejects bad expectedDeletedAtNull`, async () => {
      const { service } = buildService();

      await expect(
        service.update(opsActor, SAVED_VIEW_ID, { name: `n`, expectedDeletedAtNull: 1 }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`returns 404 when row not found`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce([]);

      await expect(
        service.update(opsActor, SAVED_VIEW_ID, { name: `n`, expectedDeletedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it(`returns 404 (not 403) when owner mismatch`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow({ owner_id: OTHER_ADMIN_ID }));

      await expect(
        service.update(opsActor, SAVED_VIEW_ID, { name: `n`, expectedDeletedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it(`returns 409 when row already soft-deleted`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow({ deleted_at: new Date() }));

      await expect(
        service.update(opsActor, SAVED_VIEW_ID, { name: `n`, expectedDeletedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(`returns 409 on Prisma P2002 unique violation`, async () => {
      const { service, queryRaw, savedViewModel } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      savedViewModel.update.mockRejectedValueOnce(Object.assign(new Error(`unique`), { code: `P2002` }));

      await expect(
        service.update(opsActor, SAVED_VIEW_ID, { name: `Conflict`, expectedDeletedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(`rejects payload exceeding the byte limit`, async () => {
      const { service } = buildService();
      const big = `x`.repeat(MAX_SAVED_VIEW_PAYLOAD_BYTES + 1);

      await expect(
        service.update(opsActor, SAVED_VIEW_ID, { queryPayload: { big }, expectedDeletedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe(`delete`, () => {
    function lockedRow(overrides: Partial<{ deleted_at: Date | null; owner_id: string }> = {}) {
      return [
        {
          id: SAVED_VIEW_ID,
          owner_id: OPS_ADMIN_ID,
          workspace: `ledger_anomalies`,
          name: `My view`,
          deleted_at: null as Date | null,
          ...overrides,
        },
      ];
    }

    it(`soft-deletes the row and records audit`, async () => {
      const { service, queryRaw, savedViewModel, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      const deletedAt = new Date(`2026-04-21T12:00:00.000Z`);
      savedViewModel.update.mockResolvedValueOnce(activeRow({ deletedAt }));

      const result = await service.delete(opsActor, SAVED_VIEW_ID, { expectedDeletedAtNull: 0 }, meta);

      expect(result).toEqual({ savedViewId: SAVED_VIEW_ID, deletedAt: deletedAt.toISOString() });
      expect(savedViewModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SAVED_VIEW_ID },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `saved_view_delete`,
          resource: `saved_view`,
          resourceId: SAVED_VIEW_ID,
          metadata: expect.objectContaining({
            workspace: `ledger_anomalies`,
            name: `My view`,
            severity: `standard`,
          }),
        }),
      );
    });

    it(`returns 404 when row not found`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce([]);

      await expect(service.delete(opsActor, SAVED_VIEW_ID, { expectedDeletedAtNull: 0 }, meta)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it(`returns 404 (not 403) when owner mismatch`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow({ owner_id: OTHER_ADMIN_ID }));

      await expect(service.delete(opsActor, SAVED_VIEW_ID, { expectedDeletedAtNull: 0 }, meta)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it(`returns 409 when already deleted`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow({ deleted_at: new Date() }));

      await expect(service.delete(opsActor, SAVED_VIEW_ID, { expectedDeletedAtNull: 0 }, meta)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it(`rejects bad expectedDeletedAtNull`, async () => {
      const { service } = buildService();

      await expect(service.delete(opsActor, SAVED_VIEW_ID, { expectedDeletedAtNull: 1 }, meta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe(`idempotency wiring`, () => {
    it(`wraps create in idempotency.execute with the right scope`, async () => {
      const { service, savedViewModel, idempotency } = buildService();
      savedViewModel.create.mockResolvedValueOnce(activeRow());

      await service.create(opsActor, { workspace: `ledger_anomalies`, name: `n`, queryPayload: null }, meta);

      expect(idempotency.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: OPS_ADMIN_ID,
          scope: `saved-view-create`,
          key: `idem-1`,
        }),
      );
    });

    it(`wraps update with the right scope`, async () => {
      const { service, queryRaw, savedViewModel, idempotency } = buildService();
      queryRaw.mockResolvedValueOnce([
        {
          id: SAVED_VIEW_ID,
          owner_id: OPS_ADMIN_ID,
          workspace: `ledger_anomalies`,
          name: `Old`,
          deleted_at: null,
        },
      ]);
      savedViewModel.update.mockResolvedValueOnce(activeRow());

      await service.update(opsActor, SAVED_VIEW_ID, { name: `New`, expectedDeletedAtNull: 0 }, meta);

      expect(idempotency.execute).toHaveBeenCalledWith(expect.objectContaining({ scope: `saved-view-update` }));
    });

    it(`wraps delete with the right scope`, async () => {
      const { service, queryRaw, savedViewModel, idempotency } = buildService();
      queryRaw.mockResolvedValueOnce([
        {
          id: SAVED_VIEW_ID,
          owner_id: OPS_ADMIN_ID,
          workspace: `ledger_anomalies`,
          name: `n`,
          deleted_at: null,
        },
      ]);
      savedViewModel.update.mockResolvedValueOnce(activeRow({ deletedAt: new Date() }));

      await service.delete(opsActor, SAVED_VIEW_ID, { expectedDeletedAtNull: 0 }, meta);

      expect(idempotency.execute).toHaveBeenCalledWith(expect.objectContaining({ scope: `saved-view-delete` }));
    });
  });
});
