import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerContactDetails } from './dto/consumer-contact-details.dto';
import {
  ConsumerContact,
  ConsumerContactSearchItem,
  ConsumerCreateContact,
  ConsumerUpdateContact,
} from './dto/consumer-contact.dto';
import { PrismaService } from '../../../shared/prisma.service';
import { normalizeConsumerFacingTransactionStatus } from '../../consumer-status-compat';
import { buildConsumerDocumentDownloadUrl } from '../documents/document-download-url';

@Injectable()
export class ConsumerContactsService {
  constructor(private prisma: PrismaService) {}

  private getEffectiveLedgerStatus(
    entry:
      | {
          status: $Enums.TransactionStatus;
          outcomes?: Array<{ status: $Enums.TransactionStatus }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus | null {
    if (!entry) return null;
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  async get(id: string, consumerId: string): Promise<ConsumerContact> {
    const contact = await this.prisma.contactModel.findFirst({
      where: { id, consumerId },
    });

    if (!contact) throw new NotFoundException(errorCodes.CONTACT_NOT_FOUND);

    return {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      address: JSON.parse(JSON.stringify(contact.address)),
    };
  }

  async search(consumerId: string, query: string, limit = 10): Promise<ConsumerContactSearchItem[]> {
    const safeLimit = Math.min(20, Math.max(1, Math.floor(Number(limit)) || 10));
    const term = `${query.trim()}`;
    if (!term) return [];

    const contacts = await this.prisma.contactModel.findMany({
      where: {
        consumerId,
        OR: [{ email: { contains: term, mode: `insensitive` } }, { name: { contains: term, mode: `insensitive` } }],
      },
      select: { id: true, name: true, email: true },
      take: safeLimit,
      orderBy: { createdAt: `desc` },
    });

    return contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
    }));
  }

  async findByExactEmail(consumerId: string, email: string): Promise<ConsumerContactSearchItem | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const contact = await this.prisma.contactModel.findFirst({
      where: {
        consumerId,
        email: {
          equals: normalizedEmail,
          mode: `insensitive`,
        },
      },
      select: { id: true, name: true, email: true },
    });

    if (!contact) return null;
    return {
      id: contact.id,
      name: contact.name,
      email: contact.email,
    };
  }

  async getDetails(id: string, consumerId: string, backendBaseUrl?: string): Promise<ConsumerContactDetails> {
    const contact = await this.prisma.contactModel.findFirst({
      where: { id, consumerId },
    });

    if (!contact) throw new NotFoundException(errorCodes.CONTACT_NOT_FOUND);

    const paymentRequests = await this.prisma.paymentRequestModel.findMany({
      where: {
        OR: [{ payer: { email: contact.email } }, { requester: { email: contact.email } }],
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

    const documents = paymentRequests.flatMap((paymentRequest) =>
      paymentRequest.attachments.map((paymentRequestAttachment) => ({
        id: paymentRequestAttachment.resource.id,
        name: paymentRequestAttachment.resource.originalName,
        url: buildConsumerDocumentDownloadUrl(paymentRequestAttachment.resource.id, backendBaseUrl),
        createdAt: paymentRequestAttachment.resource.createdAt,
      })),
    );

    return {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      address: JSON.parse(JSON.stringify(contact.address)),
      paymentRequests: paymentRequests.map((paymentRequest) => ({
        id: paymentRequest.id,
        amount: paymentRequest.amount.toString(),
        status: normalizeConsumerFacingTransactionStatus(
          this.getEffectiveLedgerStatus(paymentRequest.ledgerEntries[0]) ?? paymentRequest.status,
        ),
        createdAt: paymentRequest.createdAt,
      })),
      documents,
    };
  }

  async list(
    consumerId: string,
    page = 1,
    pageSize = 10,
  ): Promise<{ items: ConsumerContact[]; total: number; page: number; pageSize: number }> {
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safePageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 10));

    const [total, contacts] = await Promise.all([
      this.prisma.contactModel.count({ where: { consumerId } }),
      this.prisma.contactModel.findMany({
        where: { consumerId },
        orderBy: { createdAt: `desc` },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
    ]);

    const items = contacts.map((contact) => ({
      id: contact.id,
      email: contact.email,
      name: contact.name,
      address: JSON.parse(JSON.stringify(contact.address)),
    }));

    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async create(consumerId: string, body: ConsumerCreateContact) {
    const existByEmail = await this.prisma.contactModel.findFirst({
      where: { consumerId, email: body.email },
    });

    if (existByEmail) {
      throw new ConflictException(errorCodes.CONTACT_EMAIL_ALREADY_EXISTS);
    }

    return this.prisma.contactModel.create({
      data: {
        email: body.email,
        name: body.name,
        address: body.address ? JSON.parse(JSON.stringify(body.address)) : null,
        consumer: { connect: { id: consumerId } },
      },
    });
  }

  async update(id: string, consumerId: string, body: ConsumerUpdateContact) {
    return this.prisma.contactModel.update({
      where: { id, consumerId },
      data: {
        email: body.email,
        name: body.name,
        address: body.address === undefined ? undefined : JSON.parse(JSON.stringify(body.address)),
      },
    });
  }

  async delete(id: string, consumerId: string) {
    await this.prisma.contactModel.delete({ where: { id, consumerId } });
    return { success: true };
  }
}
