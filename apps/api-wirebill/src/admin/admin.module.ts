import { Module } from '@nestjs/common';

import { AdminAuthModule } from './admin-auth/admin-auth.module';

@Module({ imports: [AdminAuthModule] })
export class AdminModule {}
