import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { AdminDocumentTagService } from './admin-document-tag.service';
import { AdminV2DocumentsCommandsRepository } from './admin-v2-documents-commands.repository';
import { AdminV2DocumentsRepository } from './admin-v2-documents.repository';
import {
  buildDocumentDownloadUrl,
  buildDocumentEvidenceScopeWhere,
  resolveCanonicalConsumer,
  uniqueIds,
} from './document-query-helpers';
import { FileStorageService } from '../../consumer/modules/files/file-storage.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { buildStaleVersionPayload, deriveVersion, toNullableIso } from '../admin-v2-version-utils';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

function normalizePage(value?: number): number {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : DEFAULT_PAGE;
}

function normalizePageSize(value?: number): number {
  if (!Number.isFinite(value) || !value) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value)));
}

@Injectable()
export class AdminV2DocumentsService {
  constructor(
    private readonly storage: FileStorageService,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly assignmentsService: AdminV2AssignmentsService,
    private readonly documentsQuery: AdminV2DocumentsRepository,
    private readonly documentsCommands: AdminV2DocumentsCommandsRepository,
    private readonly tagService: AdminDocumentTagService,
  ) {}

  async listDocuments(params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    consumerId?: string;
    access?: string;
    mimetype?: string;
    sizeMin?: number;
    sizeMax?: number;
    createdFrom?: string;
    createdTo?: string;
    paymentRequestId?: string;
    tag?: string;
    tagId?: string;
    includeDeleted?: boolean;
    backendBaseUrl?: string;
  }) {
    const page = normalizePage(params?.page);
    const pageSize = normalizePageSize(params?.pageSize);
    const q = params?.q?.trim();
    const tag = params?.tag?.trim().toLowerCase();
    const access = this.normalizeAccess(params?.access);
    const createdRange = this.normalizeCreatedRange(params?.createdFrom, params?.createdTo);
    const sizeRange = this.normalizeSizeRange(params?.sizeMin, params?.sizeMax);

    const where: Prisma.ResourceModelWhereInput = {
      ...(params?.includeDeleted ? {} : { deletedAt: null }),
      AND: [
        buildDocumentEvidenceScopeWhere(),
        ...(q
          ? [
              {
                OR: [
                  { id: q },
                  {
                    originalName: {
                      contains: q,
                      mode: `insensitive`,
                    },
                  },
                ],
              } satisfies Prisma.ResourceModelWhereInput,
            ]
          : []),
        ...(params?.consumerId?.trim()
          ? [
              {
                consumerResources: {
                  some: {
                    consumerId: params.consumerId.trim(),
                    deletedAt: null,
                  },
                },
              } satisfies Prisma.ResourceModelWhereInput,
            ]
          : []),
        ...(access ? [{ access } satisfies Prisma.ResourceModelWhereInput] : []),
        ...(params?.mimetype?.trim()
          ? [
              {
                mimetype: {
                  equals: params.mimetype.trim(),
                  mode: `insensitive`,
                },
              } satisfies Prisma.ResourceModelWhereInput,
            ]
          : []),
        ...(sizeRange ? [{ size: sizeRange } satisfies Prisma.ResourceModelWhereInput] : []),
        ...(createdRange ? [{ createdAt: createdRange } satisfies Prisma.ResourceModelWhereInput] : []),
        ...(params?.paymentRequestId?.trim()
          ? [
              {
                attachments: {
                  some: {
                    paymentRequestId: params.paymentRequestId.trim(),
                    deletedAt: null,
                  },
                },
              } satisfies Prisma.ResourceModelWhereInput,
            ]
          : []),
        ...(tag
          ? [
              {
                resourceTags: {
                  some: {
                    tag: {
                      name: tag,
                    },
                  },
                },
              } satisfies Prisma.ResourceModelWhereInput,
            ]
          : []),
        ...(params?.tagId?.trim()
          ? [
              {
                resourceTags: {
                  some: {
                    tagId: params.tagId.trim(),
                  },
                },
              } satisfies Prisma.ResourceModelWhereInput,
            ]
          : []),
      ],
    };

    const [items, total] = await Promise.all([
      this.documentsQuery.findMany(where, page, pageSize),
      this.documentsQuery.count(where),
    ]);

    const assigneeMap = await this.assignmentsService.getActiveAssigneesForResource(
      `document`,
      items.map((resource) => resource.id),
    );

    return {
      items: items.map((resource) => {
        const consumer = resolveCanonicalConsumer(resource.consumerResources);
        return {
          id: resource.id,
          originalName: resource.originalName,
          access: resource.access,
          mimeType: resource.mimetype,
          size: resource.size,
          consumerId: consumer?.id ?? null,
          consumerEmail: consumer?.email ?? null,
          createdAt: resource.createdAt.toISOString(),
          version: deriveVersion(resource.updatedAt),
          tags: resource.resourceTags.map((resourceTag) => resourceTag.tag.name),
          linkedPaymentRequestIds: this.mapLinkedPaymentRequestIds(resource.attachments),
          assignedTo: assigneeMap.get(resource.id) ?? null,
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  async getDocumentCase(resourceId: string, backendBaseUrl?: string) {
    const [resource, assignment] = await Promise.all([
      this.documentsQuery.findCaseResource({
        id: resourceId,
        AND: [buildDocumentEvidenceScopeWhere()],
      }),
      this.assignmentsService.getAssignmentContextForResource(`document`, resourceId),
    ]);

    if (!resource) {
      throw new NotFoundException(`Document not found`);
    }

    const consumer = resolveCanonicalConsumer(resource.consumerResources);
    return {
      id: resource.id,
      core: {
        id: resource.id,
        originalName: resource.originalName,
        access: resource.access,
        mimeType: resource.mimetype,
        size: resource.size,
        createdAt: resource.createdAt.toISOString(),
        deletedAt: toNullableIso(resource.deletedAt),
      },
      consumer: consumer
        ? {
            id: consumer.id,
            email: consumer.email,
          }
        : null,
      tags: resource.resourceTags.map((resourceTag) => ({
        id: resourceTag.tag.id,
        name: resourceTag.tag.name,
      })),
      linkedPaymentRequests: this.mapLinkedPaymentRequests(resource.attachments),
      downloadUrl: buildDocumentDownloadUrl(resource.id, backendBaseUrl),
      version: deriveVersion(resource.updatedAt),
      updatedAt: resource.updatedAt.toISOString(),
      staleWarning: false,
      dataFreshnessClass: `exact`,
      assignment,
    };
  }

  async listTags() {
    return this.tagService.listTags();
  }

  async openDownload(resourceId: string) {
    const resource = await this.documentsQuery.findDownloadResource({
      id: resourceId,
      AND: [buildDocumentEvidenceScopeWhere()],
    });

    if (!resource) {
      throw new NotFoundException(`Document not found`);
    }

    return this.storage.openDownloadStream(resource);
  }

  async createTag(adminId: string, body: { name?: string | null }, meta?: RequestMeta) {
    return this.tagService.createTag(adminId, body, meta);
  }

  async updateTag(
    tagId: string,
    adminId: string,
    body: { name?: string | null; version?: number },
    meta?: RequestMeta,
  ) {
    return this.tagService.updateTag(tagId, adminId, body, meta);
  }

  async deleteTag(tagId: string, adminId: string, body: { version?: number; confirmed?: boolean }, meta?: RequestMeta) {
    return this.tagService.deleteTag(tagId, adminId, body, meta);
  }

  async retagDocument(
    resourceId: string,
    adminId: string,
    body: { version?: number; tagIds?: string[] | null },
    meta?: RequestMeta,
  ) {
    const expectedVersion = this.parseVersion(body.version, `Document version is required`);
    const tagIds = uniqueIds(body.tagIds);

    return this.idempotency.execute({
      adminId,
      scope: `document-retag:${resourceId}`,
      key: meta?.idempotencyKey,
      payload: { resourceId, expectedVersion, tagIds },
      execute: async () => {
        const resource = await this.documentsQuery.findResourceForRetag({
          id: resourceId,
          AND: [buildDocumentEvidenceScopeWhere()],
        });

        if (!resource) {
          throw new NotFoundException(`Document not found`);
        }
        if (resource.deletedAt) {
          throw new ConflictException(`Soft-deleted documents stay investigation-only`);
        }
        if (deriveVersion(resource.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Document`, resource.updatedAt));
        }

        const allowedTags = await this.tagService.loadTagSelection(tagIds);
        if (allowedTags.some((tag) => this.tagService.isReservedTag(tag.name))) {
          throw new ConflictException(`Reserved invoice tags are system-managed and cannot be changed from Documents`);
        }

        const result = await this.documentsCommands.replaceDocumentTagsWithAudit({
          resource,
          adminId,
          allowedTags,
          meta,
        });

        return {
          resourceId: result.resourceId,
          tagIds: result.tagIds,
          version: deriveVersion(result.updatedAt),
          updatedAt: result.updatedAt.toISOString(),
        };
      },
    });
  }

  async bulkTagDocuments(
    adminId: string,
    body: {
      tagIds?: string[] | null;
      resources?: Array<{ resourceId: string; version: number }> | null;
    },
    meta?: RequestMeta,
  ) {
    const tagIds = uniqueIds(body.tagIds);
    const resources = (body.resources ?? [])
      .map((resource) => ({
        resourceId: resource.resourceId?.trim() ?? ``,
        version: Number(resource.version),
      }))
      .filter((resource) => resource.resourceId.length > 0);

    if (tagIds.length === 0) {
      throw new BadRequestException(`At least one tag is required for bulk tagging`);
    }
    if (resources.length === 0) {
      throw new BadRequestException(`At least one document is required for bulk tagging`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `document-bulk-tag`,
      key: meta?.idempotencyKey,
      payload: { tagIds, resources },
      execute: async () => {
        const allowedTags = await this.tagService.loadTagSelection(tagIds);
        if (allowedTags.some((tag) => this.tagService.isReservedTag(tag.name))) {
          throw new ConflictException(`Reserved invoice tags are system-managed and cannot be changed from Documents`);
        }

        const resourceIds = resources.map((resource) => resource.resourceId);
        const documents = await this.documentsQuery.findBulkTagDocuments({
          id: { in: resourceIds },
          AND: [buildDocumentEvidenceScopeWhere()],
        });

        if (documents.length !== resourceIds.length) {
          throw new NotFoundException(`One or more documents were not found`);
        }

        const byId = new Map(documents.map((document) => [document.id, document]));
        for (const resource of resources) {
          const current = byId.get(resource.resourceId);
          if (!current) {
            throw new NotFoundException(`One or more documents were not found`);
          }
          if (current.deletedAt) {
            throw new ConflictException(`Soft-deleted documents stay investigation-only`);
          }
          if (!Number.isFinite(resource.version) || resource.version < 1) {
            throw new BadRequestException(`Every bulk-tag document must include a valid version`);
          }
          if (deriveVersion(current.updatedAt) !== resource.version) {
            throw new ConflictException(buildStaleVersionPayload(`Document`, current.updatedAt));
          }
        }

        return this.documentsCommands.bulkAttachTagsWithAudit({
          adminId,
          documents: documents.map((document) => ({
            id: document.id,
            updatedAt: document.updatedAt,
          })),
          allowedTags,
          meta,
        });
      },
    });
  }

  private mapLinkedPaymentRequestIds(
    attachments: Array<{
      paymentRequest: {
        id: string;
      };
    }>,
  ) {
    return Array.from(new Set(attachments.map((attachment) => attachment.paymentRequest.id)));
  }

  private mapLinkedPaymentRequests(
    attachments: Array<{
      paymentRequest: {
        id: string;
        amount: Prisma.Decimal;
        status: $Enums.TransactionStatus;
        createdAt: Date;
      };
    }>,
  ) {
    const seen = new Set<string>();
    return attachments
      .map((attachment) => attachment.paymentRequest)
      .filter((paymentRequest) => {
        if (seen.has(paymentRequest.id)) {
          return false;
        }
        seen.add(paymentRequest.id);
        return true;
      })
      .map((paymentRequest) => ({
        id: paymentRequest.id,
        amount: paymentRequest.amount.toString(),
        status: paymentRequest.status,
        createdAt: paymentRequest.createdAt.toISOString(),
      }));
  }

  private normalizeAccess(value?: string) {
    if (!value?.trim()) {
      return undefined;
    }
    return Object.values($Enums.ResourceAccess).includes(value.trim() as $Enums.ResourceAccess)
      ? (value.trim() as $Enums.ResourceAccess)
      : undefined;
  }

  private normalizeCreatedRange(createdFrom?: string, createdTo?: string) {
    const range: Prisma.DateTimeFilter = {};
    if (createdFrom?.trim()) {
      const parsed = new Date(createdFrom.trim());
      if (!Number.isNaN(parsed.getTime())) {
        range.gte = parsed;
      }
    }
    if (createdTo?.trim()) {
      const parsed = new Date(createdTo.trim());
      if (!Number.isNaN(parsed.getTime())) {
        range.lte = parsed;
      }
    }
    return Object.keys(range).length > 0 ? range : undefined;
  }

  private normalizeSizeRange(sizeMin?: number, sizeMax?: number) {
    const range: Prisma.IntFilter = {};
    if (Number.isFinite(sizeMin)) {
      range.gte = Number(sizeMin);
    }
    if (Number.isFinite(sizeMax)) {
      range.lte = Number(sizeMax);
    }
    return Object.keys(range).length > 0 ? range : undefined;
  }

  private parseVersion(value: number | undefined, errorMessage: string) {
    const version = Number(value);
    if (!Number.isFinite(version) || version < 1) {
      throw new BadRequestException(errorMessage);
    }
    return version;
  }
}
