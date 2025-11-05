import { type Provider } from '@nestjs/common';

import { AdminAuthService } from './admin-auth.service';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

export const adminAuthProviders = [
  AdminAuthService, //
  AdminJwtStrategy,
  PrismaService,
] satisfies Provider[];
