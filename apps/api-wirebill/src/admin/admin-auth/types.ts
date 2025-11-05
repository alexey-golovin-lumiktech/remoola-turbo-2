import { type AdminType } from '@remoola/database';

export interface RefreshTokenPayload {
  type: AdminType;
  email: string;
  typ: `access` | `refresh`;

  sub: string;
  exp: number;
  iat: number;
}

export const ConsumerKind = {} as const;
