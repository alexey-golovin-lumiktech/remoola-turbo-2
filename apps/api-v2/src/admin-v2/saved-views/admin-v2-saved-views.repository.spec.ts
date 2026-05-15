import { ConflictException, NotFoundException } from '@nestjs/common';

import { AdminV2SavedViewsRepository } from './admin-v2-saved-views.repository';

describe(`AdminV2SavedViewsRepository`, () => {
  function buildRepository() {
    const savedViewModel = {
      create: jest.fn(),
      update: jest.fn(),
    };
    const queryRaw = jest.fn();
    const tx = {
      savedViewModel,
      $queryRaw: queryRaw,
    };
    const prisma = {
      savedViewModel,
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    return {
      repository: new AdminV2SavedViewsRepository(
        prisma as never,
        { run: (callback: (tx: unknown) => Promise<unknown>) => prisma.$transaction(callback as never) } as never,
      ),
      savedViewModel,
      queryRaw,
    };
  }

  it(`maps create unique violations to ConflictException`, async () => {
    const { repository, savedViewModel } = buildRepository();
    savedViewModel.create.mockRejectedValueOnce(Object.assign(new Error(`unique`), { code: `P2002` }));

    await expect(
      repository.create({
        adminId: `admin-1`,
        workspace: `ledger_anomalies`,
        name: `Dup`,
        description: null,
        queryPayload: null,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it(`locks and updates a saved view row inside the transaction`, async () => {
    const { repository, savedViewModel, queryRaw } = buildRepository();
    queryRaw.mockResolvedValueOnce([
      {
        id: `saved-view-1`,
        owner_id: `admin-1`,
        workspace: `ledger_anomalies`,
        name: `Old`,
        deleted_at: null,
      },
    ]);
    savedViewModel.update.mockResolvedValueOnce({ id: `saved-view-1`, name: `New` });

    const result = await repository.update({
      savedViewId: `saved-view-1`,
      adminId: `admin-1`,
      hasName: true,
      nextName: `New`,
      hasDescription: false,
      hasPayload: false,
    });

    expect(result.previousName).toBe(`Old`);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(savedViewModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: `saved-view-1` },
        data: { name: `New` },
      }),
    );
  });

  it(`returns NotFoundException on owner mismatch during delete`, async () => {
    const { repository, queryRaw } = buildRepository();
    queryRaw.mockResolvedValueOnce([
      {
        id: `saved-view-1`,
        owner_id: `other-admin`,
        workspace: `ledger_anomalies`,
        name: `Old`,
        deleted_at: null,
      },
    ]);

    await expect(repository.softDelete({ savedViewId: `saved-view-1`, adminId: `admin-1` })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
