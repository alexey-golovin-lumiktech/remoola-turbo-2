import { Injectable } from '@nestjs/common';

import { AdminDocumentTagService } from './admin-document-tag.service';
import { AdminV2DocumentsCommandsRepository } from './admin-v2-documents-commands.repository';
import { AdminV2DocumentsRepository } from './admin-v2-documents.repository';
import { buildDocumentEvidenceScopeWhere, uniqueIds } from './document-query-helpers';
import {
  assertAllowedTagsEditable,
  assertBulkDocumentReady,
  assertBulkDocumentsLoaded,
  assertBulkTagRequest,
  assertDocumentActive,
  assertDocumentFound,
  assertVersionMatches,
  normalizeBulkTagResources,
  parseRequiredVersion,
} from './document-tagging-policy';
import { type AdminV2RequestMeta as RequestMeta } from '../admin-v2-context.types';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { deriveVersion } from '../admin-v2-version-utils';

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
    const expectedVersion = parseRequiredVersion(body.version, `Document version is required`);
    const tagIds = uniqueIds(body.tagIds);

    return this.idempotency.execute({
      adminId,
      scope: `document-retag:${resourceId}`,
      key: meta?.idempotencyKey,
      payload: { resourceId, expectedVersion, tagIds },
      execute: async () => {
        const resource = assertDocumentFound(
          await this.documentsQuery.findResourceForRetag({
            id: resourceId,
            AND: [buildDocumentEvidenceScopeWhere()],
          }),
        );
        assertDocumentActive(resource);
        assertVersionMatches(`Document`, resource.updatedAt, expectedVersion);

        const allowedTags = await this.tagService.loadTagSelection(tagIds);
        assertAllowedTagsEditable(allowedTags);

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
    const resources = normalizeBulkTagResources(body.resources);
    assertBulkTagRequest(tagIds, resources);

    return this.idempotency.execute({
      adminId,
      scope: `document-bulk-tag`,
      key: meta?.idempotencyKey,
      payload: { tagIds, resources },
      execute: async () => {
        const allowedTags = await this.tagService.loadTagSelection(tagIds);
        assertAllowedTagsEditable(allowedTags);

        const resourceIds = resources.map((resource) => resource.resourceId);
        const documents = await this.documentsQuery.findBulkTagDocuments({
          id: { in: resourceIds },
          AND: [buildDocumentEvidenceScopeWhere()],
        });
        assertBulkDocumentsLoaded(documents, resourceIds);

        const byId = new Map(documents.map((document) => [document.id, document]));
        for (const resource of resources) {
          assertBulkDocumentReady(byId.get(resource.resourceId), resource.version);
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
