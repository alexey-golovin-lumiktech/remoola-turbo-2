import { ResetPasswordCleanupScheduler } from './reset-password-cleanup.scheduler';
import { type PrismaService } from '../../shared/prisma.service';

describe(`ResetPasswordCleanupScheduler`, () => {
  it(`deletes expired reset_password rows and logs when count > 0`, async () => {
    const prisma = {
      resetPasswordModel: {
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
    } as unknown as PrismaService;

    const scheduler = new ResetPasswordCleanupScheduler(prisma);
    const logSpy = jest.spyOn(scheduler[`logger`], `log`).mockImplementation();

    await scheduler.deleteExpiredResetPasswordRows();

    expect(prisma.resetPasswordModel.deleteMany).toHaveBeenCalledWith({
      where: { expiredAt: { lt: expect.any(Date) } },
    });
    expect(logSpy).toHaveBeenCalledWith(`Reset password cleanup: deleted 3 expired row(s)`);
  });

  it(`does not log when no rows deleted`, async () => {
    const prisma = {
      resetPasswordModel: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as PrismaService;

    const scheduler = new ResetPasswordCleanupScheduler(prisma);
    const logSpy = jest.spyOn(scheduler[`logger`], `log`).mockImplementation();

    await scheduler.deleteExpiredResetPasswordRows();

    expect(prisma.resetPasswordModel.deleteMany).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it(`does not throw when delete fails`, async () => {
    const prisma = {
      resetPasswordModel: {
        deleteMany: jest.fn().mockRejectedValue(new Error(`db unavailable`)),
      },
    } as unknown as PrismaService;

    const scheduler = new ResetPasswordCleanupScheduler(prisma);
    const warnSpy = jest.spyOn(scheduler[`logger`], `warn`).mockImplementation();

    await expect(scheduler.deleteExpiredResetPasswordRows()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`db unavailable`));
  });
});
