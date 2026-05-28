import { describe, expect, it, jest } from '@jest/globals';

import { type PasswordResetRepository } from './password-reset.repository';
import { ResetPasswordCleanupScheduler } from './reset-password-cleanup.scheduler';

describe(`ResetPasswordCleanupScheduler`, () => {
  it(`deletes expired reset_password rows and logs when count > 0`, async () => {
    const passwordResetRepository = {
      deleteExpiredTokens: jest.fn<(...a: any[]) => any>().mockResolvedValue(3),
    } as unknown as PasswordResetRepository;

    const scheduler = new ResetPasswordCleanupScheduler(passwordResetRepository);
    const logSpy = jest.spyOn(scheduler[`logger`], `log`).mockImplementation(() => undefined);

    await scheduler.deleteExpiredResetPasswordRows();

    expect(passwordResetRepository.deleteExpiredTokens).toHaveBeenCalledWith();
    expect(logSpy).toHaveBeenCalledWith(`Reset password cleanup: deleted 3 expired row(s)`);
  });

  it(`does not log when no rows deleted`, async () => {
    const passwordResetRepository = {
      deleteExpiredTokens: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
    } as unknown as PasswordResetRepository;

    const scheduler = new ResetPasswordCleanupScheduler(passwordResetRepository);
    const logSpy = jest.spyOn(scheduler[`logger`], `log`).mockImplementation(() => undefined);

    await scheduler.deleteExpiredResetPasswordRows();

    expect(passwordResetRepository.deleteExpiredTokens).toHaveBeenCalledWith();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it(`does not throw when delete fails`, async () => {
    const passwordResetRepository = {
      deleteExpiredTokens: jest.fn<(...a: any[]) => any>().mockRejectedValue(new Error(`db unavailable`)),
    } as unknown as PasswordResetRepository;

    const scheduler = new ResetPasswordCleanupScheduler(passwordResetRepository);
    const warnSpy = jest.spyOn(scheduler[`logger`], `warn`).mockImplementation(() => undefined);

    await expect(scheduler.deleteExpiredResetPasswordRows()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`db unavailable`));
  });
});
