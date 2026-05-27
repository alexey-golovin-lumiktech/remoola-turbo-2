import { BadRequestException, Logger, type ArgumentsHost } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { ApiExceptionFilter } from './api-exception.filter';
import { SqlValidationError } from '../../shared/prisma-raw.utils';

function mockHost() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const request = {
    correlationId: `corr-123`,
    path: `/api/test`,
    url: `/api/test?debug=1`,
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe(`ApiExceptionFilter`, () => {
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, `error`).mockImplementation();
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it(`adds request metadata to ordinary HTTP exceptions`, () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = mockHost();

    filter.catch(new BadRequestException({ message: [`email must be an email`], error: `Bad Request` }), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: `Bad Request`,
        message: [`email must be an email`],
        correlationId: `corr-123`,
        path: `/api/test`,
        timestamp: expect.any(String),
      }),
    );
  });

  it(`preserves Prisma known error mapping`, () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = mockHost();
    const error = new Prisma.PrismaClientKnownRequestError(`Unique constraint failed`, {
      code: `P2002`,
      clientVersion: `test`,
    });

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        error: `Unique constraint failed`,
        message: `Unique constraint failed`,
        code: `P2002`,
        correlationId: `corr-123`,
      }),
    );
  });

  it(`maps SQL validation errors into the API envelope`, () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = mockHost();

    filter.catch(new SqlValidationError(`INVALID_UUID`, `consumerId`, `consumerId must be a uuid`), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: `consumerId must be a uuid`,
        message: `consumerId must be a uuid`,
        code: `INVALID_UUID`,
        details: { label: `consumerId` },
        correlationId: `corr-123`,
      }),
    );
  });

  it(`maps Prisma validation errors into the API envelope`, () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = mockHost();

    filter.catch(new Prisma.PrismaClientValidationError(`Argument where is missing`, { clientVersion: `test` }), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: `PRISMA_VALIDATION_ERROR`,
        message: expect.any(String),
        correlationId: `corr-123`,
      }),
    );
  });

  it(`does not log handled exceptions as unhandled`, () => {
    const filter = new ApiExceptionFilter();
    const { host } = mockHost();
    const error = new Prisma.PrismaClientKnownRequestError(`Unique constraint failed`, {
      code: `P2002`,
      clientVersion: `test`,
    });

    filter.catch(new BadRequestException({ message: [`email must be an email`], error: `Bad Request` }), host);
    filter.catch(error, host);
    filter.catch(new SqlValidationError(`INVALID_UUID`, `consumerId`, `consumerId must be a uuid`), host);

    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it(`hides unexpected exception details`, () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = mockHost();

    filter.catch(new Error(`database password leaked in stack`), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: `InternalServerError`,
        message: `Internal server error`,
        correlationId: `corr-123`,
      }),
    );
    expect(JSON.stringify(response.json.mock.calls[0]?.[0])).not.toContain(`database password leaked`);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `api_unhandled_exception`,
        correlationId: `corr-123`,
        path: `/api/test`,
        errorName: `Error`,
        errorMessage: `database password leaked in stack`,
        stack: expect.stringContaining(`database password leaked in stack`),
      }),
    );
  });
});
