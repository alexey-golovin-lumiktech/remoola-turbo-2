import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import {
  MAX_COUNT_GT_VALUE,
  MIN_COUNT_GT_VALUE,
  assertValidThresholdPayload,
} from './admin-v2-operational-alerts-thresholds';
import {
  MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES,
  MAX_OPERATIONAL_ALERT_THRESHOLD_PAYLOAD_BYTES,
} from './admin-v2-operational-alerts.dto';
import {
  AdminV2OperationalAlertsService,
  type OperationalAlertActorContext,
} from './admin-v2-operational-alerts.service';

const OPS_ADMIN_ID = `11111111-1111-4111-8111-111111111111`;
const OTHER_ADMIN_ID = `22222222-2222-4222-8222-222222222222`;
const ALERT_ID = `33333333-3333-4333-8333-333333333333`;

const opsActor: OperationalAlertActorContext = { id: OPS_ADMIN_ID, email: `ops@example.com`, type: `ADMIN` };

type AlertModelRow = {
  id: string;
  ownerId: string;
  workspace: string;
  name: string;
  description: string | null;
  queryPayload: unknown;
  thresholdPayload: unknown;
  evaluationIntervalMinutes: number;
  lastEvaluatedAt: Date | null;
  lastEvaluationError: string | null;
  lastFiredAt: Date | null;
  lastFireReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const REF_QUERY_PAYLOAD = { class: `stalePendingEntries`, dateFrom: `2026-04-01`, dateTo: `2026-04-30` };
const REF_THRESHOLD_PAYLOAD = { type: `count_gt`, value: 5 };

function activeRow(overrides: Partial<AlertModelRow> = {}): AlertModelRow {
  return {
    id: ALERT_ID,
    ownerId: OPS_ADMIN_ID,
    workspace: `ledger_anomalies`,
    name: `My alert`,
    description: null,
    queryPayload: REF_QUERY_PAYLOAD,
    thresholdPayload: REF_THRESHOLD_PAYLOAD,
    evaluationIntervalMinutes: 5,
    lastEvaluatedAt: null,
    lastEvaluationError: null,
    lastFiredAt: null,
    lastFireReason: null,
    createdAt: new Date(`2026-04-21T10:00:00.000Z`),
    updatedAt: new Date(`2026-04-21T10:00:00.000Z`),
    deletedAt: null,
    ...overrides,
  };
}

function buildService() {
  const operationalAlertModel = {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const queryRaw = jest.fn();
  const transactionTx = {
    operationalAlertModel,
    $queryRaw: queryRaw,
  };
  const prisma = {
    operationalAlertModel,
    $queryRaw: queryRaw,
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(transactionTx)),
  };
  const idempotency = {
    execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
  };
  const adminActionAudit = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  const service = new AdminV2OperationalAlertsService(prisma as never, idempotency as never, adminActionAudit as never);

  return { service, prisma, operationalAlertModel, queryRaw, idempotency, adminActionAudit };
}

const meta = {
  ipAddress: `127.0.0.1`,
  userAgent: `jest`,
  idempotencyKey: `idem-1`,
};

describe(`AdminV2OperationalAlertsService`, () => {
  describe(`list`, () => {
    it(`returns own active alerts for the workspace sorted by name`, async () => {
      const { service, operationalAlertModel } = buildService();
      const a = activeRow({ id: `a`, name: `Alpha` });
      const b = activeRow({ id: `b`, name: `Bravo` });
      operationalAlertModel.findMany.mockResolvedValueOnce([a, b]);

      const result = await service.list(opsActor, `ledger_anomalies`);

      expect(result.alerts).toHaveLength(2);
      expect(result.alerts[0]?.name).toBe(`Alpha`);
      expect(operationalAlertModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: OPS_ADMIN_ID, workspace: `ledger_anomalies`, deletedAt: null },
          orderBy: { name: `asc` },
          take: 200,
        }),
      );
    });

    it(`returns empty array when no alerts exist`, async () => {
      const { service, operationalAlertModel } = buildService();
      operationalAlertModel.findMany.mockResolvedValueOnce([]);

      const result = await service.list(opsActor, `ledger_anomalies`);

      expect(result).toEqual({ alerts: [] });
    });

    it(`rejects unknown workspace with 400`, async () => {
      const { service } = buildService();

      await expect(service.list(opsActor, `payments`)).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`enforces 200-row hard cap via take`, async () => {
      const { service, operationalAlertModel } = buildService();
      const rows = Array.from({ length: 200 }, (_, i) => activeRow({ id: `id-${i}`, name: `Alert ${i}` }));
      operationalAlertModel.findMany.mockResolvedValueOnce(rows);

      const result = await service.list(opsActor, `ledger_anomalies`);

      expect(result.alerts).toHaveLength(200);
      expect(operationalAlertModel.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
    });

    it(`projects snapshot fields (lastFiredAt, lastEvaluationError, lastFireReason, lastEvaluatedAt)`, async () => {
      const { service, operationalAlertModel } = buildService();
      const fired = new Date(`2026-04-21T10:30:00.000Z`);
      const evaluated = new Date(`2026-04-21T10:35:00.000Z`);
      operationalAlertModel.findMany.mockResolvedValueOnce([
        activeRow({
          lastEvaluatedAt: evaluated,
          lastFiredAt: fired,
          lastFireReason: `count=8 exceeded threshold=5 (count_gt)`,
          lastEvaluationError: null,
        }),
      ]);

      const result = await service.list(opsActor, `ledger_anomalies`);
      expect(result.alerts[0]).toMatchObject({
        lastEvaluatedAt: evaluated.toISOString(),
        lastFiredAt: fired.toISOString(),
        lastFireReason: `count=8 exceeded threshold=5 (count_gt)`,
        lastEvaluationError: null,
      });
    });
  });

  describe(`create`, () => {
    it(`creates a row and records audit without payloads in metadata`, async () => {
      const { service, operationalAlertModel, adminActionAudit } = buildService();
      operationalAlertModel.create.mockResolvedValueOnce(activeRow());

      const result = await service.create(
        opsActor,
        {
          workspace: `ledger_anomalies`,
          name: `My alert`,
          description: `desc`,
          queryPayload: REF_QUERY_PAYLOAD,
          thresholdPayload: REF_THRESHOLD_PAYLOAD,
          evaluationIntervalMinutes: 5,
        },
        meta,
      );

      expect(result.id).toBe(ALERT_ID);
      expect(operationalAlertModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: OPS_ADMIN_ID,
            workspace: `ledger_anomalies`,
            name: `My alert`,
            description: `desc`,
            evaluationIntervalMinutes: 5,
          }),
        }),
      );
      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `alert_create`,
          resource: `operational_alert`,
          resourceId: ALERT_ID,
          metadata: expect.objectContaining({
            workspace: `ledger_anomalies`,
            name: `My alert`,
            evaluationIntervalMinutes: 5,
            severity: `standard`,
            queryPayloadBytes: expect.any(Number),
            thresholdPayloadBytes: expect.any(Number),
            thresholdType: `count_gt`,
          }),
        }),
      );
      const auditCall = adminActionAudit.record.mock.calls[0]![0]!;
      expect(auditCall.metadata).not.toHaveProperty(`queryPayload`);
      expect(auditCall.metadata).not.toHaveProperty(`thresholdPayload`);
    });

    it(`maps Prisma P2002 to ConflictException`, async () => {
      const { service, operationalAlertModel } = buildService();
      operationalAlertModel.create.mockRejectedValueOnce(Object.assign(new Error(`unique`), { code: `P2002` }));

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `Dup`,
            queryPayload: null,
            thresholdPayload: REF_THRESHOLD_PAYLOAD,
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(`succeeds when reusing the name of a soft-deleted row (DB partial unique decides)`, async () => {
      const { service, operationalAlertModel } = buildService();
      operationalAlertModel.create.mockResolvedValueOnce(activeRow({ name: `Reused` }));

      const result = await service.create(
        opsActor,
        {
          workspace: `ledger_anomalies`,
          name: `Reused`,
          queryPayload: null,
          thresholdPayload: REF_THRESHOLD_PAYLOAD,
        },
        meta,
      );

      expect(result.name).toBe(`Reused`);
    });

    it(`rejects unknown workspace`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          { workspace: `payments`, name: `n`, queryPayload: null, thresholdPayload: REF_THRESHOLD_PAYLOAD },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects empty workspace`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          { workspace: ``, name: `n`, queryPayload: null, thresholdPayload: REF_THRESHOLD_PAYLOAD } as never,
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects empty name (after trim)`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `   `,
            queryPayload: null,
            thresholdPayload: REF_THRESHOLD_PAYLOAD,
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects too long name (>100)`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `a`.repeat(101),
            queryPayload: null,
            thresholdPayload: REF_THRESHOLD_PAYLOAD,
          },
          meta,
        ),
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
            thresholdPayload: REF_THRESHOLD_PAYLOAD,
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects queryPayload exceeding the byte limit`, async () => {
      const { service } = buildService();
      const big = `x`.repeat(MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES + 1);

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `n`,
            queryPayload: { big },
            thresholdPayload: REF_THRESHOLD_PAYLOAD,
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects primitive queryPayload`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `n`,
            queryPayload: `string` as unknown,
            thresholdPayload: REF_THRESHOLD_PAYLOAD,
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects thresholdPayload exceeding the byte limit`, async () => {
      const { service } = buildService();
      const big = { type: `count_gt`, value: 1, padding: `x`.repeat(MAX_OPERATIONAL_ALERT_THRESHOLD_PAYLOAD_BYTES) };

      await expect(
        service.create(
          opsActor,
          { workspace: `ledger_anomalies`, name: `n`, queryPayload: null, thresholdPayload: big },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects primitive thresholdPayload`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          { workspace: `ledger_anomalies`, name: `n`, queryPayload: null, thresholdPayload: `bad` },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects thresholdPayload missing type`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          { workspace: `ledger_anomalies`, name: `n`, queryPayload: null, thresholdPayload: { value: 5 } },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects thresholdPayload with unknown type`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `n`,
            queryPayload: null,
            thresholdPayload: { type: `rate_change`, value: 5 },
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects count_gt without value`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          { workspace: `ledger_anomalies`, name: `n`, queryPayload: null, thresholdPayload: { type: `count_gt` } },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects count_gt with non-integer value`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `n`,
            queryPayload: null,
            thresholdPayload: { type: `count_gt`, value: 1.5 },
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects count_gt below MIN`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `n`,
            queryPayload: null,
            thresholdPayload: { type: `count_gt`, value: MIN_COUNT_GT_VALUE - 1 },
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects count_gt above MAX`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `n`,
            queryPayload: null,
            thresholdPayload: { type: `count_gt`, value: MAX_COUNT_GT_VALUE + 1 },
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects count_gt with extra unknown key`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `n`,
            queryPayload: null,
            thresholdPayload: { type: `count_gt`, value: 5, extra: `nope` },
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`coerces undefined evaluationIntervalMinutes to default 5`, async () => {
      const { service, operationalAlertModel } = buildService();
      operationalAlertModel.create.mockResolvedValueOnce(activeRow());

      await service.create(
        opsActor,
        {
          workspace: `ledger_anomalies`,
          name: `n`,
          queryPayload: null,
          thresholdPayload: REF_THRESHOLD_PAYLOAD,
        },
        meta,
      );

      expect(operationalAlertModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ evaluationIntervalMinutes: 5 }) }),
      );
    });

    it(`rejects evaluationIntervalMinutes = 0`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `n`,
            queryPayload: null,
            thresholdPayload: REF_THRESHOLD_PAYLOAD,
            evaluationIntervalMinutes: 0,
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects evaluationIntervalMinutes = 1441`, async () => {
      const { service } = buildService();

      await expect(
        service.create(
          opsActor,
          {
            workspace: `ledger_anomalies`,
            name: `n`,
            queryPayload: null,
            thresholdPayload: REF_THRESHOLD_PAYLOAD,
            evaluationIntervalMinutes: 1441,
          },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`accepts queryPayload exactly at the byte boundary`, async () => {
      const { service, operationalAlertModel } = buildService();
      operationalAlertModel.create.mockResolvedValueOnce(activeRow());
      const value = `x`.repeat(MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES - 10);

      await service.create(
        opsActor,
        {
          workspace: `ledger_anomalies`,
          name: `n`,
          queryPayload: { v: value },
          thresholdPayload: REF_THRESHOLD_PAYLOAD,
        },
        meta,
      );

      expect(operationalAlertModel.create).toHaveBeenCalled();
    });
  });

  describe(`update`, () => {
    function lockedRow(
      overrides: Partial<{ deleted_at: Date | null; owner_id: string; name: string; workspace: string }> = {},
    ) {
      return [
        {
          id: ALERT_ID,
          owner_id: OPS_ADMIN_ID,
          workspace: `ledger_anomalies`,
          name: `Old name`,
          deleted_at: null as Date | null,
          ...overrides,
        },
      ];
    }

    it(`updates name only and does NOT reset evaluation state`, async () => {
      const { service, queryRaw, operationalAlertModel, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      operationalAlertModel.update.mockResolvedValueOnce(activeRow({ name: `New name` }));

      await service.update(opsActor, ALERT_ID, { name: `New name`, expectedDeletedAtNull: 0 }, meta);

      expect(operationalAlertModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ALERT_ID },
          data: { name: `New name` },
        }),
      );
      const auditMeta = adminActionAudit.record.mock.calls[0]![0]!.metadata;
      expect(auditMeta.changedFields).toEqual([`name`]);
      expect(auditMeta.evaluationStateReset).toBe(false);
      expect(auditMeta.previousName).toBe(`Old name`);
    });

    it(`updates description only and does NOT reset evaluation state`, async () => {
      const { service, queryRaw, operationalAlertModel, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      operationalAlertModel.update.mockResolvedValueOnce(activeRow({ description: `desc` }));

      await service.update(opsActor, ALERT_ID, { description: `desc`, expectedDeletedAtNull: 0 }, meta);

      expect(operationalAlertModel.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { description: `desc` } }),
      );
      const auditMeta = adminActionAudit.record.mock.calls[0]![0]!.metadata;
      expect(auditMeta.evaluationStateReset).toBe(false);
    });

    it(`updates queryPayload AND resets evaluation state`, async () => {
      const { service, queryRaw, operationalAlertModel, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      operationalAlertModel.update.mockResolvedValueOnce(activeRow());

      await service.update(opsActor, ALERT_ID, { queryPayload: { x: 1 }, expectedDeletedAtNull: 0 }, meta);

      expect(operationalAlertModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            queryPayload: { x: 1 },
            lastEvaluatedAt: null,
            lastEvaluationError: null,
            lastFiredAt: null,
            lastFireReason: null,
          },
        }),
      );
      const auditMeta = adminActionAudit.record.mock.calls[0]![0]!.metadata;
      expect(auditMeta.evaluationStateReset).toBe(true);
    });

    it(`updates thresholdPayload AND resets evaluation state`, async () => {
      const { service, queryRaw, operationalAlertModel } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      operationalAlertModel.update.mockResolvedValueOnce(activeRow());

      await service.update(
        opsActor,
        ALERT_ID,
        { thresholdPayload: { type: `count_gt`, value: 50 }, expectedDeletedAtNull: 0 },
        meta,
      );

      expect(operationalAlertModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            thresholdPayload: { type: `count_gt`, value: 50 },
            lastEvaluatedAt: null,
            lastFiredAt: null,
          }),
        }),
      );
    });

    it(`updates evaluationIntervalMinutes AND resets evaluation state`, async () => {
      const { service, queryRaw, operationalAlertModel } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      operationalAlertModel.update.mockResolvedValueOnce(activeRow());

      await service.update(opsActor, ALERT_ID, { evaluationIntervalMinutes: 60, expectedDeletedAtNull: 0 }, meta);

      expect(operationalAlertModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            evaluationIntervalMinutes: 60,
            lastEvaluatedAt: null,
            lastFiredAt: null,
          }),
        }),
      );
    });

    it(`re-validates threshold inside the transaction against the locked workspace`, async () => {
      const { service, queryRaw, operationalAlertModel } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());

      await expect(
        service.update(
          opsActor,
          ALERT_ID,
          { thresholdPayload: { type: `unknown`, value: 1 }, expectedDeletedAtNull: 0 },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(operationalAlertModel.update).not.toHaveBeenCalled();
    });

    it(`updates multiple fields in one call (single update statement)`, async () => {
      const { service, queryRaw, operationalAlertModel } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      operationalAlertModel.update.mockResolvedValueOnce(activeRow({ name: `New`, description: `D` }));

      await service.update(
        opsActor,
        ALERT_ID,
        {
          name: `New`,
          description: `D`,
          queryPayload: { x: 1 },
          thresholdPayload: { type: `count_gt`, value: 10 },
          evaluationIntervalMinutes: 30,
          expectedDeletedAtNull: 0,
        },
        meta,
      );

      expect(operationalAlertModel.update).toHaveBeenCalledTimes(1);
      expect(operationalAlertModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: `New`,
            description: `D`,
            queryPayload: { x: 1 },
            thresholdPayload: { type: `count_gt`, value: 10 },
            evaluationIntervalMinutes: 30,
            lastEvaluatedAt: null,
            lastEvaluationError: null,
            lastFiredAt: null,
            lastFireReason: null,
          },
        }),
      );
    });

    it(`rejects empty body (no fields)`, async () => {
      const { service } = buildService();

      await expect(service.update(opsActor, ALERT_ID, { expectedDeletedAtNull: 0 }, meta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it(`rejects bad expectedDeletedAtNull`, async () => {
      const { service } = buildService();

      await expect(
        service.update(opsActor, ALERT_ID, { name: `n`, expectedDeletedAtNull: 1 }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`returns 404 when row not found`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce([]);

      await expect(
        service.update(opsActor, ALERT_ID, { name: `n`, expectedDeletedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it(`returns 404 (not 403) when owner mismatch`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow({ owner_id: OTHER_ADMIN_ID }));

      await expect(
        service.update(opsActor, ALERT_ID, { name: `n`, expectedDeletedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it(`returns 409 when row already soft-deleted`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow({ deleted_at: new Date() }));

      await expect(
        service.update(opsActor, ALERT_ID, { name: `n`, expectedDeletedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(`returns 409 on Prisma P2002 unique violation`, async () => {
      const { service, queryRaw, operationalAlertModel } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      operationalAlertModel.update.mockRejectedValueOnce(Object.assign(new Error(`unique`), { code: `P2002` }));

      await expect(
        service.update(opsActor, ALERT_ID, { name: `Conflict`, expectedDeletedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(`rejects queryPayload exceeding the byte limit`, async () => {
      const { service } = buildService();
      const big = `x`.repeat(MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES + 1);

      await expect(
        service.update(opsActor, ALERT_ID, { queryPayload: { big }, expectedDeletedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects evaluationIntervalMinutes out of range on update`, async () => {
      const { service } = buildService();

      await expect(
        service.update(opsActor, ALERT_ID, { evaluationIntervalMinutes: 0, expectedDeletedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`workspace is immutable: DTO does not expose it; even if injected at runtime, it is ignored`, async () => {
      const { service, queryRaw, operationalAlertModel } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      operationalAlertModel.update.mockResolvedValueOnce(activeRow({ name: `n2` }));

      const body = { name: `n2`, expectedDeletedAtNull: 0, workspace: `payments` } as never;
      await service.update(opsActor, ALERT_ID, body, meta);

      const updateCall = operationalAlertModel.update.mock.calls[0]![0]!;
      expect(updateCall.data).not.toHaveProperty(`workspace`);
    });
  });

  describe(`delete`, () => {
    function lockedRow(overrides: Partial<{ deleted_at: Date | null; owner_id: string }> = {}) {
      return [
        {
          id: ALERT_ID,
          owner_id: OPS_ADMIN_ID,
          workspace: `ledger_anomalies`,
          name: `My alert`,
          deleted_at: null as Date | null,
          ...overrides,
        },
      ];
    }

    it(`soft-deletes the row and records audit`, async () => {
      const { service, queryRaw, operationalAlertModel, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow());
      const deletedAt = new Date(`2026-04-21T12:00:00.000Z`);
      operationalAlertModel.update.mockResolvedValueOnce(activeRow({ deletedAt }));

      const result = await service.delete(opsActor, ALERT_ID, { expectedDeletedAtNull: 0 }, meta);

      expect(result).toEqual({ operationalAlertId: ALERT_ID, deletedAt: deletedAt.toISOString() });
      expect(operationalAlertModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ALERT_ID },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `alert_delete`,
          resource: `operational_alert`,
          resourceId: ALERT_ID,
          metadata: expect.objectContaining({
            workspace: `ledger_anomalies`,
            name: `My alert`,
            severity: `standard`,
          }),
        }),
      );
      const auditMeta = adminActionAudit.record.mock.calls[0]![0]!.metadata;
      expect(auditMeta).not.toHaveProperty(`queryPayload`);
      expect(auditMeta).not.toHaveProperty(`thresholdPayload`);
    });

    it(`returns 404 when row not found`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce([]);

      await expect(service.delete(opsActor, ALERT_ID, { expectedDeletedAtNull: 0 }, meta)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it(`returns 404 (not 403) when owner mismatch`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow({ owner_id: OTHER_ADMIN_ID }));

      await expect(service.delete(opsActor, ALERT_ID, { expectedDeletedAtNull: 0 }, meta)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it(`returns 409 when already deleted`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce(lockedRow({ deleted_at: new Date() }));

      await expect(service.delete(opsActor, ALERT_ID, { expectedDeletedAtNull: 0 }, meta)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it(`rejects bad expectedDeletedAtNull`, async () => {
      const { service } = buildService();

      await expect(service.delete(opsActor, ALERT_ID, { expectedDeletedAtNull: 1 }, meta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe(`idempotency wiring`, () => {
    it(`wraps create in idempotency.execute with the right scope`, async () => {
      const { service, operationalAlertModel, idempotency } = buildService();
      operationalAlertModel.create.mockResolvedValueOnce(activeRow());

      await service.create(
        opsActor,
        {
          workspace: `ledger_anomalies`,
          name: `n`,
          queryPayload: null,
          thresholdPayload: REF_THRESHOLD_PAYLOAD,
        },
        meta,
      );

      expect(idempotency.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: OPS_ADMIN_ID,
          scope: `operational-alert-create`,
          key: `idem-1`,
        }),
      );
    });

    it(`wraps update with the right scope`, async () => {
      const { service, queryRaw, operationalAlertModel, idempotency } = buildService();
      queryRaw.mockResolvedValueOnce([
        {
          id: ALERT_ID,
          owner_id: OPS_ADMIN_ID,
          workspace: `ledger_anomalies`,
          name: `Old`,
          deleted_at: null,
        },
      ]);
      operationalAlertModel.update.mockResolvedValueOnce(activeRow());

      await service.update(opsActor, ALERT_ID, { name: `New`, expectedDeletedAtNull: 0 }, meta);

      expect(idempotency.execute).toHaveBeenCalledWith(expect.objectContaining({ scope: `operational-alert-update` }));
    });

    it(`wraps delete with the right scope`, async () => {
      const { service, queryRaw, operationalAlertModel, idempotency } = buildService();
      queryRaw.mockResolvedValueOnce([
        {
          id: ALERT_ID,
          owner_id: OPS_ADMIN_ID,
          workspace: `ledger_anomalies`,
          name: `n`,
          deleted_at: null,
        },
      ]);
      operationalAlertModel.update.mockResolvedValueOnce(activeRow({ deletedAt: new Date() }));

      await service.delete(opsActor, ALERT_ID, { expectedDeletedAtNull: 0 }, meta);

      expect(idempotency.execute).toHaveBeenCalledWith(expect.objectContaining({ scope: `operational-alert-delete` }));
    });
  });

  describe(`assertValidThresholdPayload (standalone)`, () => {
    it(`accepts well-formed count_gt`, () => {
      expect(() => assertValidThresholdPayload({ type: `count_gt`, value: 5 }, `ledger_anomalies`)).not.toThrow();
    });

    it(`accepts boundary values`, () => {
      expect(() =>
        assertValidThresholdPayload({ type: `count_gt`, value: MIN_COUNT_GT_VALUE }, `ledger_anomalies`),
      ).not.toThrow();
      expect(() =>
        assertValidThresholdPayload({ type: `count_gt`, value: MAX_COUNT_GT_VALUE }, `ledger_anomalies`),
      ).not.toThrow();
    });

    it(`rejects array threshold`, () => {
      expect(() => assertValidThresholdPayload([1, 2, 3] as never, `ledger_anomalies`)).toThrow(BadRequestException);
    });

    it(`rejects null threshold`, () => {
      expect(() => assertValidThresholdPayload(null, `ledger_anomalies`)).toThrow(BadRequestException);
    });
  });
});
