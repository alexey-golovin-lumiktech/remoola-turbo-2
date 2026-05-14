import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2DocumentsQuery {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where: Prisma.ResourceModelWhereInput, page: number, pageSize: number) {
    return this.prisma.resourceModel.findMany({
      where,
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        consumerResources: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: `asc` }, { id: `asc` }],
          select: {
            consumer: {
              select: {
                id: true,
                email: true,
                deletedAt: true,
              },
            },
          },
        },
        resourceTags: {
          orderBy: [{ tag: { name: `asc` } }, { id: `asc` }],
          select: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        attachments: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          select: {
            paymentRequest: {
              select: {
                id: true,
                amount: true,
                currencyCode: true,
                status: true,
                createdAt: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });
  }

  count(where: Prisma.ResourceModelWhereInput) {
    return this.prisma.resourceModel.count({ where });
  }

  findCaseResource(where: Prisma.ResourceModelWhereInput) {
    return this.prisma.resourceModel.findFirst({
      where,
      include: {
        consumerResources: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: `asc` }, { id: `asc` }],
          select: {
            consumer: {
              select: {
                id: true,
                email: true,
                deletedAt: true,
              },
            },
          },
        },
        resourceTags: {
          orderBy: [{ tag: { name: `asc` } }, { id: `asc` }],
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        attachments: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          select: {
            paymentRequest: {
              select: {
                id: true,
                amount: true,
                currencyCode: true,
                status: true,
                createdAt: true,
                deletedAt: true,
                payerId: true,
                payerEmail: true,
                requesterId: true,
                requesterEmail: true,
              },
            },
          },
        },
      },
    });
  }

  listTags() {
    return this.prisma.documentTagModel.findMany({
      orderBy: [{ name: `asc` }, { id: `asc` }],
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            resourceTags: true,
          },
        },
      },
    });
  }

  findDownloadResource(where: Prisma.ResourceModelWhereInput) {
    return this.prisma.resourceModel.findFirst({
      where,
      select: {
        bucket: true,
        key: true,
        originalName: true,
        mimetype: true,
      },
    });
  }

  findTagByName(name: string) {
    return this.prisma.documentTagModel.findUnique({
      where: { name },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    });
  }

  findTagById(tagId: string) {
    return this.prisma.documentTagModel.findUnique({
      where: { id: tagId },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    });
  }

  findResourceForRetag(where: Prisma.ResourceModelWhereInput) {
    return this.prisma.resourceModel.findFirst({
      where,
      select: {
        id: true,
        updatedAt: true,
        deletedAt: true,
        resourceTags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  findBulkTagDocuments(where: Prisma.ResourceModelWhereInput) {
    return this.prisma.resourceModel.findMany({
      where,
      select: {
        id: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
  }

  loadTagSelection(tagIds: string[]) {
    return this.prisma.documentTagModel.findMany({
      where: {
        id: {
          in: tagIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
  }
}
