import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

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

    if (!contact) throw new NotFoundException(errorCodes.CONTACT_NOT_FOUND);

    const paymentRequests = await this.prisma.paymentRequestModel.findMany({
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

    const documents = paymentRequests.flatMap((paymentRequest) =>
      paymentRequest.attachments.map((paymentRequestAttachment) => ({
        id: paymentRequestAttachment.resource.id,
        name: paymentRequestAttachment.resource.originalName,
        url: paymentRequestAttachment.resource.downloadUrl,
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
        status: paymentRequest.status,
        createdAt: paymentRequest.createdAt,
      })),
      documents,
    };
  }

  async list(consumerId: string): Promise<ConsumerContact[]> {
    const contacts = await this.prisma.contactModel.findMany({
      where: { consumerId },
      orderBy: { createdAt: `desc` },
    });

    return contacts.map((contact) => ({
      id: contact.id,
      email: contact.email,
      name: contact.name,
      address: JSON.parse(JSON.stringify(contact.address)),
    }));
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
        address: JSON.parse(JSON.stringify(body.address)),
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
        address: JSON.parse(JSON.stringify(body.address)),
      },
    });
  }

  async delete(id: string, consumerId: string) {
    await this.prisma.contactModel.delete({ where: { id, consumerId } });
    return { success: true };
  }
}
