import { type Provider } from '@nestjs/common';

import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

export const providers = [
  AuthService, //
  JwtStrategy,
] satisfies Provider[];
