import { Module } from '@nestjs/common';

import { PrismaTransactionRunner } from './prisma-transaction.runner';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService, PrismaTransactionRunner],
  exports: [PrismaService, PrismaTransactionRunner],
})
export class PrismaModule {}
