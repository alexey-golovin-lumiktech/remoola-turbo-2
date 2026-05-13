import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { LoggingInterceptor } from './logging.interceptor';

function mockContext(statusCode = 200): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method: `GET`,
        path: `/api/health`,
        correlationId: `corr-123`,
        get: jest.fn().mockReturnValue(`jest-agent`),
      }),
      getResponse: () => ({
        statusCode,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe(`LoggingInterceptor`, () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(`logs request completion on successful responses`, (done) => {
    const loggerLog = jest.spyOn(Logger.prototype, `log`).mockImplementation(() => undefined);
    const interceptor = new LoggingInterceptor();
    const next: CallHandler = { handle: () => of({ ok: true }) };

    interceptor.intercept(mockContext(204), next).subscribe({
      complete: () => {
        expect(loggerLog).toHaveBeenCalledWith(
          expect.objectContaining({
            message: `Request completed`,
            event: `http_request_completed`,
            correlationId: `corr-123`,
            method: `GET`,
            path: `/api/health`,
            statusCode: 204,
            durationMs: expect.any(Number),
          }),
        );
        done();
      },
    });
  });

  it(`logs client request failures as warnings with status and correlation id`, (done) => {
    jest.spyOn(Logger.prototype, `log`).mockImplementation(() => undefined);
    const loggerWarn = jest.spyOn(Logger.prototype, `warn`).mockImplementation(() => undefined);
    const loggerError = jest.spyOn(Logger.prototype, `error`).mockImplementation(() => undefined);
    const interceptor = new LoggingInterceptor();
    const next: CallHandler = { handle: () => throwError(() => new BadRequestException(`bad input`)) };

    interceptor.intercept(mockContext(), next).subscribe({
      error: () => {
        const payload = loggerWarn.mock.calls[0][0];

        expect(loggerWarn).toHaveBeenCalledWith(
          expect.objectContaining({
            message: `Request failed`,
            event: `http_request_failed`,
            correlationId: `corr-123`,
            method: `GET`,
            path: `/api/health`,
            statusCode: 400,
            durationMs: expect.any(Number),
            errorName: `BadRequestException`,
          }),
        );
        expect(payload).not.toHaveProperty(`errorMessage`);
        expect(JSON.stringify(loggerWarn.mock.calls)).not.toContain(`bad input`);
        expect(loggerError).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it(`logs server request failures as errors`, (done) => {
    jest.spyOn(Logger.prototype, `log`).mockImplementation(() => undefined);
    const loggerWarn = jest.spyOn(Logger.prototype, `warn`).mockImplementation(() => undefined);
    const loggerError = jest.spyOn(Logger.prototype, `error`).mockImplementation(() => undefined);
    const interceptor = new LoggingInterceptor();
    const next: CallHandler = { handle: () => throwError(() => new InternalServerErrorException(`boom`)) };

    interceptor.intercept(mockContext(), next).subscribe({
      error: () => {
        const payload = loggerError.mock.calls[0][0];

        expect(loggerError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: `Request failed`,
            event: `http_request_failed`,
            correlationId: `corr-123`,
            method: `GET`,
            path: `/api/health`,
            statusCode: 500,
            durationMs: expect.any(Number),
            errorName: `InternalServerErrorException`,
          }),
        );
        expect(payload).not.toHaveProperty(`errorMessage`);
        expect(JSON.stringify(loggerError.mock.calls)).not.toContain(`boom`);
        expect(loggerWarn).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it(`logs mapped Prisma conflict errors as warnings`, (done) => {
    jest.spyOn(Logger.prototype, `log`).mockImplementation(() => undefined);
    const loggerWarn = jest.spyOn(Logger.prototype, `warn`).mockImplementation(() => undefined);
    const loggerError = jest.spyOn(Logger.prototype, `error`).mockImplementation(() => undefined);
    const interceptor = new LoggingInterceptor();
    const prismaError = new Prisma.PrismaClientKnownRequestError(`Unique constraint failed`, {
      clientVersion: `test`,
      code: `P2002`,
      meta: { target: [`idempotencyKey`] },
    });
    const next: CallHandler = { handle: () => throwError(() => prismaError) };

    interceptor.intercept(mockContext(), next).subscribe({
      error: () => {
        expect(loggerWarn).toHaveBeenCalledWith(
          expect.objectContaining({
            message: `Request failed`,
            event: `http_request_failed`,
            statusCode: 409,
            errorName: `PrismaClientKnownRequestError`,
            errorCode: `P2002`,
          }),
        );
        expect(loggerError).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it(`logs Prisma validation errors as sanitized client warnings`, (done) => {
    jest.spyOn(Logger.prototype, `log`).mockImplementation(() => undefined);
    const loggerWarn = jest.spyOn(Logger.prototype, `warn`).mockImplementation(() => undefined);
    const loggerError = jest.spyOn(Logger.prototype, `error`).mockImplementation(() => undefined);
    const interceptor = new LoggingInterceptor();
    const rawMessage = `Invalid prisma.user.findMany() invocation with secret@example.com in args`;
    const prismaError = new Prisma.PrismaClientValidationError(rawMessage, {
      clientVersion: `test`,
    });
    const next: CallHandler = { handle: () => throwError(() => prismaError) };

    interceptor.intercept(mockContext(), next).subscribe({
      error: () => {
        expect(loggerWarn).toHaveBeenCalledWith(
          expect.objectContaining({
            message: `Request failed`,
            event: `http_request_failed`,
            statusCode: 400,
            errorName: `PrismaClientValidationError`,
            errorCode: `PRISMA_VALIDATION_ERROR`,
          }),
        );
        expect(JSON.stringify(loggerWarn.mock.calls)).not.toContain(`secret@example.com`);
        expect(loggerWarn.mock.calls[0][0]).not.toHaveProperty(`errorMessage`);
        expect(loggerError).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it(`logs allowlisted domain error codes without raw exception messages`, (done) => {
    jest.spyOn(Logger.prototype, `log`).mockImplementation(() => undefined);
    const loggerWarn = jest.spyOn(Logger.prototype, `warn`).mockImplementation(() => undefined);
    const loggerError = jest.spyOn(Logger.prototype, `error`).mockImplementation(() => undefined);
    const interceptor = new LoggingInterceptor();
    const next: CallHandler = {
      handle: () => throwError(() => new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_TRANSFER)),
    };

    interceptor.intercept(mockContext(), next).subscribe({
      error: () => {
        expect(loggerWarn).toHaveBeenCalledWith(
          expect.objectContaining({
            message: `Request failed`,
            event: `http_request_failed`,
            statusCode: 400,
            errorName: `BadRequestException`,
            errorCode: errorCodes.IDEMPOTENCY_KEY_REQUIRED_TRANSFER,
          }),
        );
        expect(loggerWarn.mock.calls[0][0]).not.toHaveProperty(`errorMessage`);
        expect(loggerError).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
