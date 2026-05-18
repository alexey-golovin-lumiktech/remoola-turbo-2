import { type Prisma } from '@remoola/database-2';

import { toNullableIso } from '../admin-v2-version-utils';

type CanonicalConsumer = {
  id: string;
  email: string | null;
  deletedAt: string | null;
};

export function buildDocumentEvidenceScopeWhere(): Prisma.ResourceModelWhereInput {
  return {
    OR: [
      {
        consumerResources: {
          some: {
            deletedAt: null,
          },
        },
      },
      {
        attachments: {
          some: {
            deletedAt: null,
          },
        },
      },
    ],
  };
}

export function buildDocumentDownloadUrl(resourceId: string, backendBaseUrl?: string): string {
  if (!backendBaseUrl) {
    return `/api/admin-v2/documents/${resourceId}/download`;
  }
  return new URL(`/api/admin-v2/documents/${resourceId}/download`, backendBaseUrl).toString();
}

export function resolveCanonicalConsumer(
  consumerResources: Array<{
    consumer: {
      id: string;
      email: string | null;
      deletedAt: Date | null;
    };
  }>,
): CanonicalConsumer | null {
  const relation = consumerResources[0];
  if (!relation || consumerResources.length !== 1) {
    return null;
  }

  return {
    id: relation.consumer.id,
    email: relation.consumer.email,
    deletedAt: toNullableIso(relation.consumer.deletedAt),
  };
}

export function uniqueIds(values: readonly string[] | null | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}
