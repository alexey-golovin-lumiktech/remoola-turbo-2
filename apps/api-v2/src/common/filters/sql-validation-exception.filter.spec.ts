import { type ArgumentsHost } from '@nestjs/common';

import { SqlValidationExceptionFilter } from './sql-validation-exception.filter';
import { SqlValidationError } from '../../shared/prisma-raw.utils';

function mockHost() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const request = {
    correlationId: `corr-123`,
    path: `/api/admin-v2/assignments`,
    url: `/api/admin-v2/assignments?debug=1`,
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe(`SqlValidationExceptionFilter`, () => {
  it.each([
    [
      new SqlValidationError(`INVALID_SQL_UUID`, `resourceId`, `resourceId must be a valid UUID`),
      `INVALID_SQL_UUID`,
      `resourceId must be a valid UUID`,
    ],
    [
      new SqlValidationError(`INVALID_SQL_DATE`, `created_at`, `created_at must be a valid Date`),
      `INVALID_SQL_DATE`,
      `created_at must be a valid Date`,
    ],
    [
      new SqlValidationError(`INVALID_SQL_NUMBER`, `balance`, `balance must be a finite number`),
      `INVALID_SQL_NUMBER`,
      `balance must be a finite number`,
    ],
  ])(`maps raw SQL validation failures to HTTP 400`, (exception, code, message) => {
    const filter = new SqlValidationExceptionFilter();
    const { host, response } = mockHost();

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: message,
        message,
        code,
        details: { label: exception.label },
        correlationId: `corr-123`,
        path: `/api/admin-v2/assignments`,
        timestamp: expect.any(String),
      }),
    );
  });
});
