import { Throttle } from '@nestjs/throttler';

const ADMIN_V2_READ_THROTTLE = { limit: 500, ttl: 60_000 } as const;

export function AdminV2ReadThrottle(): ClassDecorator & MethodDecorator {
  return Throttle({ default: ADMIN_V2_READ_THROTTLE });
}
