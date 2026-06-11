import { $Enums, type Prisma } from '@remoola/database-2';

import {
  buildDocumentDownloadUrl,
  buildDocumentEvidenceScopeWhere,
  resolveCanonicalConsumer,
} from './document-query-helpers';
import { deriveVersion, toNullableIso } from '../admin-v2-version-utils';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type AdminDocumentListParams = {
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
};

type ListDocumentResource = {
  id: string;
  originalName: string;
  access: $Enums.ResourceAccess;
  mimetype: string | null;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  consumerResources: Array<{
    consumer: {
      id: string;
      email: string | null;
      deletedAt: Date | null;
    };
  }>;
  resourceTags: Array<{
    tag: {
      name: string;
    };
  }>;
  attachments: Array<{
    paymentRequest: {
      id: string;
    };
  }>;
};

type CaseDocumentResource = {
  id: string;
  originalName: string;
  access: $Enums.ResourceAccess;
  mimetype: string | null;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  consumerResources: Array<{
    consumer: {
      id: string;
      email: string | null;
      deletedAt: Date | null;
    };
  }>;
  resourceTags: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
  attachments: Array<{
    paymentRequest: {
      id: string;
      amount: Prisma.Decimal;
      status: $Enums.TransactionStatus;
      createdAt: Date;
    };
  }>;
};

export function normalizePage(value?: number): number {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : DEFAULT_PAGE;
}

export function normalizePageSize(value?: number): number {
  if (!Number.isFinite(value) || !value) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value)));
}

export function normalizeAccess(value?: string) {
  if (!value?.trim()) {
    return undefined;
  }
  return Object.values($Enums.ResourceAccess).includes(value.trim() as $Enums.ResourceAccess)
    ? (value.trim() as $Enums.ResourceAccess)
    : undefined;
}

export function normalizeCreatedRange(createdFrom?: string, createdTo?: string) {
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

export function normalizeSizeRange(sizeMin?: number, sizeMax?: number) {
  const range: Prisma.IntFilter = {};
  if (Number.isFinite(sizeMin)) {
    range.gte = Number(sizeMin);
  }
  if (Number.isFinite(sizeMax)) {
    range.lte = Number(sizeMax);
  }
  return Object.keys(range).length > 0 ? range : undefined;
}

export function buildListDocumentsWhere(params?: AdminDocumentListParams): Prisma.ResourceModelWhereInput {
  const q = params?.q?.trim();
  const tag = params?.tag?.trim().toLowerCase();
  const access = normalizeAccess(params?.access);
  const createdRange = normalizeCreatedRange(params?.createdFrom, params?.createdTo);
  const sizeRange = normalizeSizeRange(params?.sizeMin, params?.sizeMax);

  return {
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
}

export function buildLinkedPaymentRequestIds(
  attachments: Array<{
    paymentRequest: {
      id: string;
    };
  }>,
) {
  return Array.from(new Set(attachments.map((attachment) => attachment.paymentRequest.id)));
}

export function mapDocumentListItem<TAssignedTo>(resource: ListDocumentResource, assignedTo: TAssignedTo | null) {
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
    linkedPaymentRequestIds: buildLinkedPaymentRequestIds(resource.attachments),
    assignedTo,
  };
}

export function buildLinkedPaymentRequests(
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

export function mapDocumentCase<TAssignment>(
  resource: CaseDocumentResource,
  assignment: TAssignment,
  backendBaseUrl?: string,
) {
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
    linkedPaymentRequests: buildLinkedPaymentRequests(resource.attachments),
    downloadUrl: buildDocumentDownloadUrl(resource.id, backendBaseUrl),
    version: deriveVersion(resource.updatedAt),
    updatedAt: resource.updatedAt.toISOString(),
    staleWarning: false,
    dataFreshnessClass: `exact`,
    assignment,
  };
}
