import { type ArgumentsHost } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaExceptionFilter } from './prisma-exception.filter';

function mockHost() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const request = {
    correlationId: `corr-123`,
    path: `/api/consumer/payments`,
    url: `/api/consumer/payments?debug=1`,
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe(`PrismaExceptionFilter`, () => {
  it(`adds API error metadata to mapped Prisma known errors`, () => {
    const filter = new PrismaExceptionFilter();
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
        path: `/api/consumer/payments`,
        timestamp: expect.any(String),
      }),
    );
  });

  it(`maps database permission failures as service availability errors, not user auth errors`, () => {
    const filter = new PrismaExceptionFilter();
    const { host, response } = mockHost();
    const error = new Prisma.PrismaClientKnownRequestError(`Insufficient database permissions`, {
      code: `P2035`,
      clientVersion: `test`,
    });

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        error: `Insufficient database permissions`,
        message: `Insufficient database permissions`,
        code: `P2035`,
        correlationId: `corr-123`,
      }),
    );
  });
});
