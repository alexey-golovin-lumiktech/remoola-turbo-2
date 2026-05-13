import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';

import { JwtAuthGuard } from './jwt.guard';
import { IDENTITY } from '../common';

function mockContext(request: Record<string | symbol, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe(`JwtAuthGuard`, () => {
  it(`allows requests already authenticated by the canonical global auth guard`, () => {
    const guard = new JwtAuthGuard();
    const request = {
      [IDENTITY]: { id: `consumer-1`, email: `consumer@example.com`, type: `consumer` },
    };

    expect(guard.canActivate(mockContext(request))).toBe(true);
  });

  it(`fails closed instead of accepting a Passport-only user object`, () => {
    const guard = new JwtAuthGuard();
    const request = {
      user: { id: `consumer-1`, email: `consumer@example.com` },
    };

    expect(() => guard.canActivate(mockContext(request))).toThrow(UnauthorizedException);
    expect(request[IDENTITY]).toBeUndefined();
  });
});
