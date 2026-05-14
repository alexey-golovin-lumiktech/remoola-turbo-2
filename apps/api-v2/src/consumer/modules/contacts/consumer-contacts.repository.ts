import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

type CreateContactData = {
  email: string;
  name?: string;
  address: Prisma.InputJsonValue | null;
};

type UpdateContactData = {
  email?: string;
  name?: string;
  address?: Prisma.InputJsonValue | null;
};

@Injectable()
export class ConsumerContactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdForConsumer(id: string, consumerId: string) {
    return this.prisma.contactModel.findFirst({
      where: { id, consumerId },
    });
  }

  async search(consumerId: string, term: string, safeLimit: number) {
    return this.prisma.contactModel.findMany({
      where: {
        consumerId,
        OR: [{ email: { contains: term, mode: `insensitive` } }, { name: { contains: term, mode: `insensitive` } }],
      },
      select: { id: true, name: true, email: true },
      take: safeLimit,
      orderBy: { createdAt: `desc` },
    });
  }

  async findByExactEmail(consumerId: string, normalizedEmail: string) {
    return this.prisma.contactModel.findFirst({
      where: {
        consumerId,
        email: {
          equals: normalizedEmail,
          mode: `insensitive`,
        },
      },
      select: { id: true, name: true, email: true },
    });
  }

  async findPaymentRequestsForDetails(contactEmail: string, consumerId: string) {
    return this.prisma.paymentRequestModel.findMany({
      where: {
        OR: [{ payer: { email: contactEmail } }, { requester: { email: contactEmail } }],
      },
      include: {
        attachments: {
          include: { resource: true },
        },
        ledgerEntries: {
          where: { consumerId },
          orderBy: { createdAt: `desc` },
          take: 1,
          include: {
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        },
      },
      orderBy: { createdAt: `desc` },
    });
  }

  async countForConsumer(consumerId: string) {
    return this.prisma.contactModel.count({ where: { consumerId } });
  }

  async listForConsumer(consumerId: string, skip: number, take: number) {
    return this.prisma.contactModel.findMany({
      where: { consumerId },
      orderBy: { createdAt: `desc` },
      skip,
      take,
    });
  }

  async findByEmailForConsumer(consumerId: string, email: string) {
    return this.prisma.contactModel.findFirst({
      where: { consumerId, email },
    });
  }

  async create(consumerId: string, data: CreateContactData) {
    return this.prisma.contactModel.create({
      data: {
        email: data.email,
        name: data.name,
        address: data.address,
        consumer: { connect: { id: consumerId } },
      },
    });
  }

  async update(id: string, consumerId: string, data: UpdateContactData) {
    return this.prisma.contactModel.update({
      where: { id, consumerId },
      data,
    });
  }

  async delete(id: string, consumerId: string) {
    return this.prisma.contactModel.delete({ where: { id, consumerId } });
  }
}
