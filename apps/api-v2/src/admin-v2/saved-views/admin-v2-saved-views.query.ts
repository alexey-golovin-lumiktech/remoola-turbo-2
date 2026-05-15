import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

const savedViewListSelect = Prisma.validator<Prisma.SavedViewModelSelect>()({
  id: true,
  ownerId: true,
  workspace: true,
  name: true,
  description: true,
  queryPayload: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

type SavedViewListRow = Prisma.SavedViewModelGetPayload<{
  select: typeof savedViewListSelect;
}>;

@Injectable()
export class AdminV2SavedViewsQuery {
  constructor(private readonly prisma: PrismaService) {}

  listOwnedActiveViews(params: { ownerId: string; workspace: string; take: number }): Promise<SavedViewListRow[]> {
    return this.prisma.savedViewModel.findMany({
      where: {
        ownerId: params.ownerId,
        workspace: params.workspace,
        deletedAt: null,
      },
      orderBy: { name: `asc` },
      take: params.take,
      select: savedViewListSelect,
    });
  }
}
