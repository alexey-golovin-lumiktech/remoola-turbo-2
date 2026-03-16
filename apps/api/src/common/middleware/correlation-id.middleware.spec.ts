import { type NextFunction, type Request, type Response } from 'express';

import { CorrelationIdMiddleware } from './correlation-id.middleware';

describe(`CorrelationIdMiddleware`, () => {
  const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let middleware: CorrelationIdMiddleware;
  let next: jest.MockedFunction<NextFunction>;
  let req: Partial<Request> & { correlationId?: string };
  let res: Partial<Response>;
  let setHeader: jest.Mock;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    next = jest.fn();
    req = { headers: {} };
    setHeader = jest.fn();
    res = { setHeader };
  });

  it(`uses valid client-provided correlation id`, () => {
    req.headers = { [`x-correlation-id`]: `trace-123_abc:def` };

    middleware.use(req as never, res as Response, next);

    expect(req.correlationId).toBe(`trace-123_abc:def`);
    expect(setHeader).toHaveBeenCalledWith(`x-correlation-id`, `trace-123_abc:def`);
    expect(next).toHaveBeenCalled();
  });

  it(`generates correlation id when header is missing`, () => {
    middleware.use(req as never, res as Response, next);

    expect(req.correlationId).toMatch(UUID_V4_PATTERN);
    expect(setHeader).toHaveBeenCalledWith(`x-correlation-id`, req.correlationId);
    expect(next).toHaveBeenCalled();
  });

  it(`generates correlation id when header contains unsafe characters`, () => {
    req.headers = { [`x-correlation-id`]: `bad id with spaces` };

    middleware.use(req as never, res as Response, next);

    expect(req.correlationId).toMatch(UUID_V4_PATTERN);
    expect(req.correlationId).not.toBe(`bad id with spaces`);
    expect(setHeader).toHaveBeenCalledWith(`x-correlation-id`, req.correlationId);
  });

  it(`generates correlation id when header exceeds max length`, () => {
    req.headers = { [`x-correlation-id`]: `a`.repeat(129) };

    middleware.use(req as never, res as Response, next);

    expect(req.correlationId).toMatch(UUID_V4_PATTERN);
    expect(setHeader).toHaveBeenCalledWith(`x-correlation-id`, req.correlationId);
  });
});
