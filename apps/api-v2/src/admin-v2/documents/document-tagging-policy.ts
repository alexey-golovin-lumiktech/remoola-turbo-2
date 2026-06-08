import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { buildStaleVersionPayload, deriveVersion } from '../admin-v2-version-utils';

const RESERVED_TAG_PREFIX = `INVOICE-`;
const RESERVED_TAG_PREFIX_NORMALIZED = RESERVED_TAG_PREFIX.toLowerCase();
const RESERVED_TAG_CONFLICT_MESSAGE = `Reserved invoice tags are system-managed and cannot be changed from Documents`;

type VersionedRecord = {
  updatedAt: Date;
};

type DocumentTagRecord = VersionedRecord & {
  id: string;
  name: string;
};

type DocumentTagSelectionRecord = {
  id: string;
  name: string;
};

type RetaggableDocumentRecord = VersionedRecord & {
  id: string;
  deletedAt: Date | null;
};

type NormalizedBulkTagResource = {
  resourceId: string;
  version: number;
};

export function normalizeTagName(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? ``;
  if (!normalized) {
    throw new BadRequestException(`Tag name is required`);
  }
  if (normalized.startsWith(RESERVED_TAG_PREFIX_NORMALIZED)) {
    throw new ConflictException(RESERVED_TAG_CONFLICT_MESSAGE);
  }
  return normalized;
}

export function parseRequiredVersion(value: number | undefined, errorMessage: string) {
  const version = Number(value);
  if (!Number.isFinite(version) || version < 1) {
    throw new BadRequestException(errorMessage);
  }
  return version;
}

export function assertDeleteConfirmed(confirmed: boolean | undefined) {
  if (confirmed !== true) {
    throw new BadRequestException(`Confirmation is required for tag deletion`);
  }
}

export function isReservedTagName(name: string) {
  return name.startsWith(RESERVED_TAG_PREFIX);
}

export function assertTagFound(tag: DocumentTagRecord | null) {
  if (!tag) {
    throw new NotFoundException(`Document tag not found`);
  }

  return tag;
}

export function assertDocumentFound<T extends RetaggableDocumentRecord | null>(resource: T): NonNullable<T> {
  if (!resource) {
    throw new NotFoundException(`Document not found`);
  }

  return resource as NonNullable<T>;
}

export function assertTagSelectionComplete(
  tags: DocumentTagSelectionRecord[],
  tagIds: readonly string[],
): DocumentTagSelectionRecord[] {
  if (tags.length !== tagIds.length) {
    throw new NotFoundException(`One or more document tags were not found`);
  }

  return tags;
}

export function assertTagEditable<T extends { name: string }>(tag: T): T {
  if (isReservedTagName(tag.name)) {
    throw new ConflictException(RESERVED_TAG_CONFLICT_MESSAGE);
  }

  return tag;
}

export function assertAllowedTagsEditable(tags: Array<{ name: string }>) {
  if (tags.some((tag) => isReservedTagName(tag.name))) {
    throw new ConflictException(RESERVED_TAG_CONFLICT_MESSAGE);
  }
}

export function assertVersionMatches(resourceLabel: string, updatedAt: Date, expectedVersion: number) {
  if (deriveVersion(updatedAt) !== expectedVersion) {
    throw new ConflictException(buildStaleVersionPayload(resourceLabel, updatedAt));
  }
}

export function assertTagNameAvailable(duplicate: { id: string } | null, currentTagId: string) {
  if (duplicate && duplicate.id !== currentTagId) {
    throw new ConflictException(`Document tag name is already in use`);
  }
}

export function buildAlreadyExistsTagCreateResult(existing: DocumentTagRecord) {
  return {
    tagId: existing.id,
    name: existing.name,
    version: deriveVersion(existing.updatedAt),
    updatedAt: existing.updatedAt.toISOString(),
    alreadyExists: true,
  };
}

export function buildUnchangedTagUpdateResult(tag: DocumentTagRecord) {
  return {
    tagId: tag.id,
    name: tag.name,
    version: deriveVersion(tag.updatedAt),
    updatedAt: tag.updatedAt.toISOString(),
    unchanged: true,
  };
}

export function assertDocumentActive(resource: { deletedAt: Date | null }) {
  if (resource.deletedAt) {
    throw new ConflictException(`Soft-deleted documents stay investigation-only`);
  }
}

export function normalizeBulkTagResources(
  resources: Array<{ resourceId?: string | null; version: unknown }> | null | undefined,
): NormalizedBulkTagResource[] {
  return (resources ?? [])
    .map((resource) => ({
      resourceId: resource.resourceId?.trim() ?? ``,
      version: Number(resource.version),
    }))
    .filter((resource) => resource.resourceId.length > 0);
}

export function assertBulkTagRequest(tagIds: readonly string[], resources: readonly NormalizedBulkTagResource[]) {
  if (tagIds.length === 0) {
    throw new BadRequestException(`At least one tag is required for bulk tagging`);
  }
  if (resources.length === 0) {
    throw new BadRequestException(`At least one document is required for bulk tagging`);
  }
}

export function assertBulkDocumentsLoaded(documents: Array<{ id: string }>, resourceIds: readonly string[]) {
  if (documents.length !== resourceIds.length) {
    throw new NotFoundException(`One or more documents were not found`);
  }
}

export function assertBulkDocumentReady(document: RetaggableDocumentRecord | undefined, version: number) {
  if (!document) {
    throw new NotFoundException(`One or more documents were not found`);
  }

  assertDocumentActive(document);
  assertVersionMatches(
    `Document`,
    document.updatedAt,
    parseRequiredVersion(version, `Every bulk-tag document must include a valid version`),
  );
}
