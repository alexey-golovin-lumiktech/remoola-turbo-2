import { type ExecutionContext, type CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';

import { ConsumerActionInterceptor } from './consumer-action.interceptor';
import { type ConsumerActionLogService } from '../../shared/consumer-action-log.service';
import { IDENTITY } from '../decorators/identity.decorator';
import { TRACK_CONSUMER_ACTION } from '../decorators/track-consumer-action.decorator';

describe(`ConsumerActionInterceptor`, () => {
  let interceptor: ConsumerActionInterceptor;
  let consumerActionLog: { record: jest.Mock };
  let reflector: Reflector;

  beforeEach(() => {
    consumerActionLog = { record: jest.fn().mockResolvedValue(undefined) };
    reflector = new Reflector();
    interceptor = new ConsumerActionInterceptor(consumerActionLog as unknown as ConsumerActionLogService, reflector);
  });

  function mockContext(metadata: unknown, request: Record<string, unknown> = {}): ExecutionContext {
    const handler = jest.fn();
    jest.spyOn(reflector, `get`).mockImplementation((metadataKey: unknown) => {
      if (metadataKey === TRACK_CONSUMER_ACTION) return metadata;
      return undefined;
    });
    return {
      getHandler: () => handler,
      getArgByIndex: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          deviceId: `device-123`,
          correlationId: `corr-456`,
          path: `/api/consumer/auth/login`,
          method: `POST`,
          ip: `127.0.0.1`,
          headers: { 'user-agent': `test-agent` },
          [IDENTITY]: undefined,
          ...request,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it(`calls record on success when decorator metadata is present`, (done) => {
    const context = mockContext({ action: `consumer.auth.login`, resource: `auth` });
    const next: CallHandler = { handle: () => of(`ok`) };
    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(consumerActionLog.record).toHaveBeenCalledWith(
          expect.objectContaining({
            deviceId: `device-123`,
            action: `consumer.auth.login_success`,
            resource: `auth`,
            consumerId: null,
            ipAddress: `127.0.0.1`,
            userAgent: `test-agent`,
            correlationId: `corr-456`,
          }),
        );
        done();
      },
    });
  });

  it(`calls record with _failure when handler errors`, (done) => {
    const context = mockContext({ action: `consumer.auth.login`, resource: `auth` });
    const next: CallHandler = { handle: () => throwError(() => new Error(`fail`)) };
    interceptor.intercept(context, next).subscribe({
      error: () => {
        expect(consumerActionLog.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: `consumer.auth.login_failure`,
          }),
        );
        done();
      },
    });
  });

  it(`does not call record when decorator metadata is absent`, (done) => {
    const context = mockContext(undefined);
    const next: CallHandler = { handle: () => of(`ok`) };
    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(consumerActionLog.record).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it(`does not record actions on near-match non-consumer prefixes`, (done) => {
    const context = mockContext(
      { action: `consumer.auth.login`, resource: `auth` },
      { path: `/api/consumerx/auth/login` },
    );
    const next: CallHandler = { handle: () => of(`ok`) };
    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(consumerActionLog.record).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it(`includes consumerId when identity is consumer`, (done) => {
    const context = mockContext(
      { action: `consumer.payments.start`, resource: `payments` },
      { [IDENTITY]: { id: `consumer-uuid`, email: `u@e.com`, type: `consumer` } },
    );
    const next: CallHandler = { handle: () => of(`ok`) };
    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(consumerActionLog.record).toHaveBeenCalledWith(
          expect.objectContaining({
            consumerId: `consumer-uuid`,
          }),
        );
        done();
      },
    });
  });

  it(`does not record actions on admin paths even when metadata is present`, (done) => {
    const context = mockContext(
      { action: `consumer.auth.login`, resource: `auth` },
      { path: `/api/admin/auth/login`, [IDENTITY]: { id: `admin-uuid`, email: `a@e.com`, type: `admin` } },
    );
    const next: CallHandler = { handle: () => of(`ok`) };
    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(consumerActionLog.record).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it(`uses route template path when available`, (done) => {
    const context = mockContext(
      { action: `consumer.payments.pay_with_saved_method`, resource: `payments` },
      {
        path: `/api/consumer/stripe/abc123/pay-with-saved-method`,
        route: { path: `/api/consumer/stripe/:paymentRequestId/pay-with-saved-method` },
      },
    );
    const next: CallHandler = { handle: () => of(`ok`) };
    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(consumerActionLog.record).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              path: `/api/consumer/stripe/:paymentRequestId/pay-with-saved-method`,
            }),
          }),
        );
        done();
      },
    });
  });

  it(`uses unknown placeholder when route template is unavailable`, (done) => {
    const context = mockContext(
      { action: `consumer.stripe.pay_with_saved_method`, resource: `payments` },
      {
        path: `/api/consumer/stripe/abc123def456ghi789/pay-with-saved-method/123`,
      },
    );
    const next: CallHandler = { handle: () => of(`ok`) };
    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(consumerActionLog.record).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              path: `/api/consumer/:unknown`,
            }),
          }),
        );
        done();
      },
    });
  });

  it(`normalizes route template path before logging`, (done) => {
    const context = mockContext(
      { action: `consumer.auth.refresh`, resource: `auth` },
      {
        route: { path: `consumer/auth/refresh?ignore=true` },
      },
    );
    const next: CallHandler = { handle: () => of(`ok`) };
    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(consumerActionLog.record).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              path: `/consumer/auth/refresh`,
            }),
          }),
        );
        done();
      },
    });
  });

  it(`records callback failure action and delegates throttling to log service`, (done) => {
    const context = mockContext({ action: `consumer.auth.oauth_callback`, resource: `auth` });
    const next: CallHandler = { handle: () => throwError(() => new Error(`fail`)) };
    interceptor.intercept(context, next).subscribe({
      error: () => {
        expect(consumerActionLog.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: `consumer.auth.oauth_callback_failure`,
          }),
        );
        done();
      },
    });
  });
});
