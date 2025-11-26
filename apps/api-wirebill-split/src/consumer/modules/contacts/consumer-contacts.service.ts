import { Injectable } from '@nestjs/common';

import { ConsumerContactDetails } from './dto/consumer-contact-details.dto';
import { ConsumerContact, ConsumerCreateContact, ConsumerUpdateContact } from './dto/consumer-contact.dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerContactsService {
  constructor(private prisma: PrismaService) {}

  async getDetails(id: string, consumerId: string): Promise<ConsumerContactDetails> {
    const contact = await this.prisma.contactModel.findFirst({
      where: { id, consumerId },
    });

    if (!contact) throw new Error(`Contact not found`);

    // payment requests linked by email
    const prs = await this.prisma.paymentRequestModel.findMany({
      where: {
        OR: [{ payer: { email: contact.email } }, { requester: { email: contact.email } }],
      },
      include: {
        attachments: {
          include: { resource: true },
        },
      },
      orderBy: { createdAt: `desc` },
    });

    const documents = prs.flatMap((pr) =>
      pr.attachments.map((att) => ({
        id: att.resource.id,
        name: att.resource.originalName,
        url: att.resource.downloadUrl,
        createdAt: att.resource.createdAt,
      })),
    );

    return {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      address: JSON.parse(JSON.stringify(contact.address)),
      paymentRequests: prs.map((pr) => ({
        id: pr.id,
        amount: pr.amount.toString(),
        status: pr.status,
        createdAt: pr.createdAt,
      })),
      documents,
    };
  }

  async list(consumerId: string): Promise<ConsumerContact[]> {
    const rows = await this.prisma.contactModel.findMany({
      where: { consumerId },
      orderBy: { createdAt: `desc` },
    });

    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      address: JSON.parse(JSON.stringify(r.address)),
    }));
  }

  async create(consumerId: string, dto: ConsumerCreateContact) {
    return this.prisma.contactModel.create({
      data: {
        email: dto.email,
        name: dto.name,
        address: JSON.parse(JSON.stringify(dto.address)),
        consumer: { connect: { id: consumerId } },
      },
    });
  }

  async update(id: string, consumerId: string, dto: ConsumerUpdateContact) {
    return this.prisma.contactModel.update({
      where: { id, consumerId },
      data: {
        email: dto.email,
        name: dto.name,
        address: JSON.parse(JSON.stringify(dto.address)),
      },
    });
  }

  async delete(id: string, consumerId: string) {
    await this.prisma.contactModel.delete({ where: { id, consumerId } });
    return { success: true };
  }
}
