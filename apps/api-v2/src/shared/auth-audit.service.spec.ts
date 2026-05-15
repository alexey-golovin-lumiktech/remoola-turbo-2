import { BadRequestException } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import { type AuthAuditQuery } from './auth-audit.query';
import { type AuthAuditRepository } from './auth-audit.repository';
import { AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES, AuthAuditService } from './auth-audit.service';

describe(`AuthAuditService`, () => {
  function buildService() {
    const query = {
      findLockout: jest.fn(async () => null),
      countRecentAuditRows: jest.fn(async () => 0),
    };
    const repository = {
      createAuditLog: jest.fn(async () => undefined),
      upsertFailedAttempt: jest.fn(async () => ({
        attemptCount: 1,
        firstAttemptAt: new Date(`2026-05-15T07:00:00.000Z`),
      })),
      setLockedUntil: jest.fn(async () => undefined),
      clearLockout: jest.fn(async () => undefined),
    };

    return {
      query,
      repository,
      service: new AuthAuditService(query as unknown as AuthAuditQuery, repository as unknown as AuthAuditRepository),
    };
  }

  it(`normalizes email and delegates audit writes`, async () => {
    const { service, repository } = buildService();

    await service.recordAudit({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: `consumer-1`,
      email: `  USER@Example.com `,
      event: AUTH_AUDIT_EVENTS.login_success,
      ipAddress: `127.0.0.1`,
      userAgent: `jest`,
    });

    expect(repository.createAuditLog).toHaveBeenCalledWith({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: `consumer-1`,
      email: `user@example.com`,
      event: AUTH_AUDIT_EVENTS.login_success,
      ipAddress: `127.0.0.1`,
      userAgent: `jest`,
    });
  });

  it(`warns and swallows audit write failures`, async () => {
    const { service, repository } = buildService();
    const warnSpy = jest.spyOn((service as any).logger, `warn`).mockImplementation(() => undefined);
    repository.createAuditLog.mockRejectedValueOnce(new Error(`db unavailable`));

    await expect(
      service.recordAudit({
        identityType: AUTH_IDENTITY_TYPES.admin,
        email: `admin@example.com`,
        event: AUTH_AUDIT_EVENTS.login_failure,
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(`AuthAudit: failed to record audit`, {
      event: AUTH_AUDIT_EVENTS.login_failure,
      message: `db unavailable`,
    });
  });

  it(`throws when a lockout is currently active`, async () => {
    const { service, query } = buildService();
    query.findLockout.mockResolvedValueOnce({
      lockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(service.checkLockoutAndRateLimit(AUTH_IDENTITY_TYPES.consumer, `  User@Example.com `)).rejects.toEqual(
      new BadRequestException(errorCodes.ACCOUNT_TEMPORARILY_LOCKED),
    );

    expect(query.findLockout).toHaveBeenCalledWith(AUTH_IDENTITY_TYPES.consumer, `user@example.com`);
  });

  it(`throws when the per-email audit count crosses the configured rate limit`, async () => {
    const { service, query } = buildService();
    query.countRecentAuditRows.mockResolvedValueOnce(999);

    await expect(service.checkLockoutAndRateLimit(AUTH_IDENTITY_TYPES.admin, `Admin@Example.com`)).rejects.toEqual(
      new BadRequestException(errorCodes.TOO_MANY_LOGIN_ATTEMPTS),
    );

    expect(query.countRecentAuditRows).toHaveBeenCalledWith(
      AUTH_IDENTITY_TYPES.admin,
      `admin@example.com`,
      expect.any(Date),
    );
  });

  it(`locks the identity after enough failed attempts`, async () => {
    const { service, repository } = buildService();
    repository.upsertFailedAttempt.mockResolvedValueOnce({
      attemptCount: 999,
      firstAttemptAt: new Date(`2026-05-15T07:00:00.000Z`),
    });

    await service.recordFailedAttempt(AUTH_IDENTITY_TYPES.consumer, ` Consumer@Example.com `);

    expect(repository.upsertFailedAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        identityType: AUTH_IDENTITY_TYPES.consumer,
        email: `consumer@example.com`,
        now: expect.any(Date),
      }),
    );
    expect(repository.setLockedUntil).toHaveBeenCalledWith({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      email: `consumer@example.com`,
      lockedUntil: expect.any(Date),
      firstAttemptAt: new Date(`2026-05-15T07:00:00.000Z`),
    });
  });

  it(`silently ignores clearLockout persistence failures`, async () => {
    const { service, repository } = buildService();
    repository.clearLockout.mockRejectedValueOnce(new Error(`db unavailable`));

    await expect(service.clearLockout(AUTH_IDENTITY_TYPES.admin, ` Admin@Example.com `)).resolves.toBeUndefined();

    expect(repository.clearLockout).toHaveBeenCalledWith(AUTH_IDENTITY_TYPES.admin, `admin@example.com`);
  });
});
