import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2PayoutsTransactionRunner {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback);
  }
}
