import { ConflictException, NotFoundException } from '@nestjs/common';

import { AdminV2OperationalAlertsRepository } from './admin-v2-operational-alerts.repository';

describe(`AdminV2OperationalAlertsRepository`, () => {
  function buildRepository() {
    const operationalAlertModel = {
      create: jest.fn(),
      update: jest.fn(),
    };
    const queryRaw = jest.fn();
    const tx = {
      operationalAlertModel,
      $queryRaw: queryRaw,
    };
    const prisma = {
      operationalAlertModel,
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    return {
      repository: new AdminV2OperationalAlertsRepository(
        prisma as never,
        { run: (callback: (tx: unknown) => Promise<unknown>) => prisma.$transaction(callback as never) } as never,
      ),
      operationalAlertModel,
      queryRaw,
    };
  }

  it(`maps create unique violations to ConflictException`, async () => {
    const { repository, operationalAlertModel } = buildRepository();
    operationalAlertModel.create.mockRejectedValueOnce(Object.assign(new Error(`unique`), { code: `P2002` }));

    await expect(
      repository.create({
        adminId: `admin-1`,
        workspace: `ledger_anomalies`,
        name: `Dup`,
        description: null,
        queryPayload: null,
        thresholdPayload: { type: `count_gt`, value: 5 } as never,
        evaluationIntervalMinutes: 5,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it(`locks and updates an alert row inside the transaction`, async () => {
    const { repository, operationalAlertModel, queryRaw } = buildRepository();
    queryRaw.mockResolvedValueOnce([
      {
        id: `alert-1`,
        owner_id: `admin-1`,
        workspace: `ledger_anomalies`,
        name: `Old`,
        deleted_at: null,
      },
    ]);
    operationalAlertModel.update.mockResolvedValueOnce({ id: `alert-1`, name: `New` });

    const result = await repository.update({
      operationalAlertId: `alert-1`,
      adminId: `admin-1`,
      hasName: true,
      nextName: `New`,
      hasDescription: false,
      hasQueryPayload: false,
      hasThresholdPayload: false,
      hasInterval: false,
      evaluationStateReset: false,
    });

    expect(result.previousName).toBe(`Old`);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(operationalAlertModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: `alert-1` },
        data: { name: `New` },
      }),
    );
  });

  it(`returns NotFoundException on owner mismatch during delete`, async () => {
    const { repository, queryRaw } = buildRepository();
    queryRaw.mockResolvedValueOnce([
      {
        id: `alert-1`,
        owner_id: `other-admin`,
        workspace: `ledger_anomalies`,
        name: `Old`,
        deleted_at: null,
      },
    ]);

    await expect(repository.softDelete({ operationalAlertId: `alert-1`, adminId: `admin-1` })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
