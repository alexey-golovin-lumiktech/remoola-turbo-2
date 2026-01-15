import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class AdminLedgersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.ledgerEntryModel.findMany({
      orderBy: { createdAt: `desc` },
    });
  }
}
