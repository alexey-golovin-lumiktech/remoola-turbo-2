import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { AdminDocumentTagService } from './admin-document-tag.service';
import { AdminV2DocumentsCommandsRepository } from './admin-v2-documents-commands.repository';
import { AdminV2DocumentsRepository } from './admin-v2-documents.repository';
import { buildDocumentEvidenceScopeWhere, uniqueIds } from './document-query-helpers';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { buildStaleVersionPayload, deriveVersion } from '../admin-v2-version-utils';

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

function parseVersion(value: number | undefined, errorMessage: string) {
  const version = Number(value);
  if (!Number.isFinite(version) || version < 1) {
    throw new BadRequestException(errorMessage);
  }
  return version;
}

@Injectable()
export class AdminDocumentTaggerService {
  constructor(
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly documentsQuery: AdminV2DocumentsRepository,
    private readonly documentsCommands: AdminV2DocumentsCommandsRepository,
    private readonly tagService: AdminDocumentTagService,
  ) {}

  async retagDocument(
    resourceId: string,
    adminId: string,
    body: { version?: number; tagIds?: string[] | null },
    meta?: RequestMeta,
  ) {
    const expectedVersion = parseVersion(body.version, `Document version is required`);
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
}
