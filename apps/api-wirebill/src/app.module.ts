import { Module } from '@nestjs/common';

import { AdminModule } from './admin/admin.module';
import { ConsumerModule } from './consumer/consumer.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [AdminModule, ConsumerModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
