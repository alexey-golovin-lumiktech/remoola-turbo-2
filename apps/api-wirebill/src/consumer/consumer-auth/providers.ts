import { type Provider } from '@nestjs/common';

import { ConsumerAuthService } from './consumer-auth.service';
import { ConsumerJwtStrategy } from './consumer-jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

export const consumerAuthProviders = [
  ConsumerAuthService, //
  ConsumerJwtStrategy,
  PrismaService,
] satisfies Provider[];
