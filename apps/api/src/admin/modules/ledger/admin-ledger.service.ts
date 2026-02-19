import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class AdminLedgersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bounded list for admin (AGENTS.md 6.10). Default cap 500. */
  async findAll(params?: { page?: number; pageSize?: number }) {
    const pageSize = Math.min(Math.max(params?.pageSize ?? 500, 1), 500);
    const page = Math.max(params?.page ?? 1, 1);
    const skip = (page - 1) * pageSize;

    const [total, items] = await Promise.all([
      this.prisma.ledgerEntryModel.count(),
      this.prisma.ledgerEntryModel.findMany({
        orderBy: { createdAt: `desc` },
        skip,
        take: pageSize,
      }),
    ]);

    return { items, total, page, pageSize };
  }
}
