import { OauthStateCleanupScheduler } from './oauth-state-cleanup.scheduler';
import { type OAuthStateStoreRepository } from './oauth-state-store.repository';

describe(`OauthStateCleanupScheduler`, () => {
  it(`deletes expired oauth_state rows and logs when count > 0`, async () => {
    const oauthStateStoreRepository = {
      deleteExpiredStates: jest.fn().mockResolvedValue(3),
    } as unknown as OAuthStateStoreRepository;

    const scheduler = new OauthStateCleanupScheduler(oauthStateStoreRepository);
    const logSpy = jest.spyOn(scheduler[`logger`], `log`).mockImplementation();

    await scheduler.deleteExpiredOauthState();

    expect(oauthStateStoreRepository.deleteExpiredStates).toHaveBeenCalledWith();
    expect(logSpy).toHaveBeenCalledWith(`OAuth state cleanup: deleted 3 expired row(s)`);
  });

  it(`does not log when no rows deleted`, async () => {
    const oauthStateStoreRepository = {
      deleteExpiredStates: jest.fn().mockResolvedValue(0),
    } as unknown as OAuthStateStoreRepository;

    const scheduler = new OauthStateCleanupScheduler(oauthStateStoreRepository);
    const logSpy = jest.spyOn(scheduler[`logger`], `log`).mockImplementation();

    await scheduler.deleteExpiredOauthState();

    expect(oauthStateStoreRepository.deleteExpiredStates).toHaveBeenCalledWith();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it(`does not throw when delete fails`, async () => {
    const oauthStateStoreRepository = {
      deleteExpiredStates: jest.fn().mockRejectedValue(new Error(`db unavailable`)),
    } as unknown as OAuthStateStoreRepository;

    const scheduler = new OauthStateCleanupScheduler(oauthStateStoreRepository);
    const warnSpy = jest.spyOn(scheduler[`logger`], `warn`).mockImplementation();

    await expect(scheduler.deleteExpiredOauthState()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`db unavailable`));
  });
});
