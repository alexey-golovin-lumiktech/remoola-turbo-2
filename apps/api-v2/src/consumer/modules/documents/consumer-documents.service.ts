import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerDocumentAccessPolicy } from './consumer-document-access-policy';
import { ConsumerDocumentListRepository } from './consumer-document-list.repository';
import { type DocumentListItem } from './consumer-document-mapper';
import { normalizeConsumerDocumentTags } from './consumer-document-tags.util';
import { ConsumerDocumentRepository } from './consumer-document.repository';
import { FileStorageService } from '../../../infrastructure/storage/file-storage.service';

const SINGLE_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE =
  `This document is still attached to a draft payment request. ` +
  `Remove it from the draft before deleting it from Documents.`;
const MULTI_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE =
  `One or more selected documents are still attached to draft payment requests. ` +
  `Remove them from the draft before deleting them from Documents.`;
const SINGLE_NON_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE =
  `This document is attached to a non-draft payment request ` + `and cannot be deleted from Documents.`;
const MULTI_NON_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE =
  `One or more selected documents are attached to non-draft payment requests ` +
  `and cannot be deleted from Documents.`;

@Injectable()
export class ConsumerDocumentsService {
  constructor(
    private storage: FileStorageService,
    private readonly documentAccessPolicy: ConsumerDocumentAccessPolicy,
    private readonly documentListQuery: ConsumerDocumentListRepository,
    private readonly documentRepository: ConsumerDocumentRepository,
  ) {}

  private async assertDraftOwnedPaymentRequest(consumerId: string, paymentRequestId: string) {
    return this.documentAccessPolicy.assertDraftOwnedPaymentRequest(consumerId, paymentRequestId);
  }

  private async getConsumerEmail(consumerId: string): Promise<string | null> {
    const consumer = await this.documentRepository.findConsumerEmailById(consumerId);
    return consumer?.email?.trim().toLowerCase() ?? null;
  }

  async getDocuments(
    consumerId: string,
    kind?: string,
    page = 1,
    pageSize = 10,
    backendBaseUrl?: string,
    contactId?: string,
  ): Promise<{
    items: DocumentListItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.documentListQuery.list({
      consumerId,
      kind,
      page,
      pageSize,
      backendBaseUrl,
      contactId,
    });
  }

  async uploadDocuments(
    consumerId: string,
    files: Express.Multer.File[],
    backendBaseUrl?: string,
    paymentRequestId?: string,
  ) {
    const created: string[] = [];
    const targetPaymentRequest = paymentRequestId
      ? await this.assertDraftOwnedPaymentRequest(consumerId, paymentRequestId)
      : null;

    for (const file of files) {
      const originalName = Buffer.from(file.originalname, `latin1`).toString(`utf8`);

      const stored = await this.storage.upload(
        {
          buffer: file.buffer,
          originalName: originalName,
          mimetype: file.mimetype,
        },
        backendBaseUrl,
      );

      const resource = await this.documentRepository.createUploadedResource({
        consumerId,
        originalName,
        mimetype: file.mimetype,
        size: file.size,
        bucket: stored.bucket,
        key: stored.key,
        downloadUrl: stored.downloadUrl,
        ...(targetPaymentRequest ? { paymentRequestId: targetPaymentRequest.id } : {}),
      });

      created.push(resource.id);
    }

    return { ids: created };
  }

  async openDownload(consumerId: string, resourceId: string) {
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const resource = await this.documentRepository.findDownloadableResourceForConsumer(
      consumerId,
      resourceId,
      consumerEmail,
    );

    if (!resource) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    return this.storage.openDownloadStream(resource);
  }

  async bulkDeleteDocuments(consumerId: string, ids: string[]) {
    const normalizedIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map((id) => id?.trim()).filter(Boolean)));
    if (normalizedIds.length === 0) {
      return { success: true };
    }

    const ownedResources = await this.documentRepository.findOwnedResourceMappings(consumerId, normalizedIds);
    const ownedResourceIds = ownedResources.map((resource) => resource.resourceId);

    if (ownedResourceIds.length !== normalizedIds.length) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    const paymentAttachments = await this.documentRepository.findAttachmentStatuses(ownedResourceIds);

    const nonDraftBlockedResourceIds = new Set(
      paymentAttachments
        .filter((attachment) => attachment.paymentRequest.status !== $Enums.TransactionStatus.DRAFT)
        .map((attachment) => attachment.resourceId),
    );
    if (nonDraftBlockedResourceIds.size > 0) {
      throw new BadRequestException(
        nonDraftBlockedResourceIds.size === 1
          ? SINGLE_NON_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE
          : MULTI_NON_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE,
      );
    }

    const draftBlockedResourceIds = new Set(
      paymentAttachments
        .filter((attachment) => attachment.paymentRequest.status === $Enums.TransactionStatus.DRAFT)
        .map((attachment) => attachment.resourceId),
    );
    if (draftBlockedResourceIds.size > 0) {
      throw new BadRequestException(
        draftBlockedResourceIds.size === 1
          ? SINGLE_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE
          : MULTI_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE,
      );
    }

    await this.documentRepository.deleteOwnedResourceMappings(consumerId, ownedResourceIds);
    await this.documentRepository.deleteResourceTags(ownedResourceIds);

    return { success: true };
  }

  async deleteDocument(consumerId: string, id: string) {
    return this.bulkDeleteDocuments(consumerId, [id]);
  }

  private async getAccessibleAttachmentResources(
    consumerId: string,
    resourceIds: string[],
    consumerEmail: string | null,
  ) {
    return this.documentRepository.findAccessibleAttachmentResources(consumerId, resourceIds, consumerEmail);
  }

  async attachToPayment(consumerId: string, paymentRequestId: string, resourceIds: string[]) {
    const ids = Array.from(
      new Set((Array.isArray(resourceIds) ? resourceIds : []).map((id) => id?.trim()).filter(Boolean)),
    );
    if (ids.length === 0) {
      return { success: true };
    }

    await this.assertDraftOwnedPaymentRequest(consumerId, paymentRequestId);
    const consumerEmail = await this.getConsumerEmail(consumerId);

    const [ownedResources, accessibleAttachments] = await Promise.all([
      this.documentRepository.findOwnedAccessibleResources(consumerId, ids),
      this.getAccessibleAttachmentResources(consumerId, ids, consumerEmail),
    ]);

    const accessibleResourceIds = new Set([
      ...ownedResources.map((resource) => resource.resourceId),
      ...accessibleAttachments.map((attachment) => attachment.resourceId),
    ]);

    if (ids.some((resourceId) => !accessibleResourceIds.has(resourceId))) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    const paymentRequestAttachments = await this.documentRepository.findExistingPaymentAttachments(
      paymentRequestId,
      ids,
    );

    const existingAttachmentResourceIds = new Set(paymentRequestAttachments.map((attachment) => attachment.resourceId));

    const toCreate = ids.filter((resourceId) => !existingAttachmentResourceIds.has(resourceId));

    await this.documentRepository.createPaymentAttachments(paymentRequestId, consumerId, toCreate);

    return { success: true };
  }

  async detachFromPayment(consumerId: string, paymentRequestId: string, resourceId: string) {
    const normalizedResourceId = resourceId.trim();
    if (!normalizedResourceId) {
      throw new BadRequestException(`Resource id is required`);
    }

    const paymentRequest = await this.assertDraftOwnedPaymentRequest(consumerId, paymentRequestId);

    await this.documentRepository.detachPaymentAttachment(paymentRequest.id, consumerId, normalizedResourceId);

    return { success: true };
  }

  async setTags(consumerId: string, resourceId: string, tags: string[]) {
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const [consumerResource, accessibleAttachment] = await Promise.all([
      this.documentRepository.findConsumerResourceAccess(consumerId, resourceId),
      this.documentRepository.findAttachmentAccess(consumerId, resourceId, consumerEmail),
    ]);

    if (!consumerResource && !accessibleAttachment) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    const cleaned = normalizeConsumerDocumentTags(tags);

    const documentTags = [];
    for (const name of cleaned) {
      const documentTag = await this.documentRepository.upsertDocumentTag(name);
      documentTags.push(documentTag);
    }

    await this.documentRepository.replaceResourceTags(
      resourceId,
      documentTags.map((documentTag) => documentTag.id),
    );

    return { success: true };
  }
}
