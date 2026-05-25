import { Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2DocumentsRepository } from './admin-v2-documents.repository';
import {
  buildDocumentDownloadUrl,
  buildDocumentEvidenceScopeWhere,
  resolveCanonicalConsumer,
} from './document-query-helpers';
import { FileStorageService } from '../../infrastructure/storage/file-storage.service';
import { deriveVersion, toNullableIso } from '../admin-v2-version-utils';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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
export class AdminDocumentService {
  constructor(
    private readonly storage: FileStorageService,
    private readonly assignmentsService: AdminV2AssignmentsService,
    private readonly documentsQuery: AdminV2DocumentsRepository,
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
}
