import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import { ConsumerContactsRepository } from './consumer-contacts.repository';
import { ConsumerContactDetails } from './dto/consumer-contact-details.dto';
import {
  ConsumerContact,
  ConsumerContactSearchItem,
  ConsumerCreateContact,
  ConsumerUpdateContact,
} from './dto/consumer-contact.dto';
import { getEffectiveLedgerStatusOrNull } from '../../../shared/transaction-status.utils';
import { normalizeConsumerFacingTransactionStatus } from '../../consumer-status-compat';
import { buildConsumerDocumentDownloadUrl } from '../documents/document-download-url';

@Injectable()
export class ConsumerContactsService {
  constructor(private readonly contactsRepository: ConsumerContactsRepository) {}

  async get(id: string, consumerId: string): Promise<ConsumerContact> {
    const contact = await this.contactsRepository.findByIdForConsumer(id, consumerId);

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

    const contacts = await this.contactsRepository.search(consumerId, term, safeLimit);

    return contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
    }));
  }

  async findByExactEmail(consumerId: string, email: string): Promise<ConsumerContactSearchItem | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const contact = await this.contactsRepository.findByExactEmail(consumerId, normalizedEmail);

    if (!contact) return null;
    return {
      id: contact.id,
      name: contact.name,
      email: contact.email,
    };
  }

  async getDetails(id: string, consumerId: string, backendBaseUrl?: string): Promise<ConsumerContactDetails> {
    const contact = await this.contactsRepository.findByIdForConsumer(id, consumerId);

    if (!contact) throw new NotFoundException(errorCodes.CONTACT_NOT_FOUND);

    const paymentRequests = await this.contactsRepository.findPaymentRequestsForDetails(contact.email, consumerId);

    const documents = paymentRequests.flatMap((paymentRequest) =>
      paymentRequest.attachments.map((paymentRequestAttachment) => ({
        id: paymentRequestAttachment.resource.id,
        name: paymentRequestAttachment.resource.originalName,
        downloadUrl: buildConsumerDocumentDownloadUrl(paymentRequestAttachment.resource.id, backendBaseUrl),
        createdAt: paymentRequestAttachment.resource.createdAt.toISOString(),
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
          getEffectiveLedgerStatusOrNull(paymentRequest.ledgerEntries[0]) ?? paymentRequest.status,
        ),
        createdAt: paymentRequest.createdAt.toISOString(),
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
      this.contactsRepository.countForConsumer(consumerId),
      this.contactsRepository.listForConsumer(consumerId, (safePage - 1) * safePageSize, safePageSize),
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
    const existByEmail = await this.contactsRepository.findByEmailForConsumer(consumerId, body.email);

    if (existByEmail) {
      throw new ConflictException(errorCodes.CONTACT_EMAIL_ALREADY_EXISTS);
    }

    return this.contactsRepository.create(consumerId, {
      email: body.email,
      name: body.name,
      address: body.address ? JSON.parse(JSON.stringify(body.address)) : null,
    });
  }

  async update(id: string, consumerId: string, body: ConsumerUpdateContact) {
    return this.contactsRepository.update(id, consumerId, {
      email: body.email,
      name: body.name,
      address: body.address === undefined ? undefined : JSON.parse(JSON.stringify(body.address)),
    });
  }

  async delete(id: string, consumerId: string) {
    await this.contactsRepository.delete(id, consumerId);
    return { success: true };
  }
}
