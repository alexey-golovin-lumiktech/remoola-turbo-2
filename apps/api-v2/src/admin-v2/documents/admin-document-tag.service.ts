import { Injectable } from '@nestjs/common';

import { AdminV2DocumentsCommandsRepository } from './admin-v2-documents-commands.repository';
import { AdminV2DocumentsRepository } from './admin-v2-documents.repository';
import {
  assertDeleteConfirmed,
  assertTagEditable,
  assertTagFound,
  assertTagNameAvailable,
  assertTagSelectionComplete,
  assertVersionMatches,
  buildAlreadyExistsTagCreateResult,
  buildUnchangedTagUpdateResult,
  isReservedTagName,
  normalizeTagName,
  parseRequiredVersion,
} from './document-tagging-policy';
import { type AdminV2RequestMeta as RequestMeta } from '../admin-v2-context.types';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { deriveVersion } from '../admin-v2-version-utils';

@Injectable()
export class AdminDocumentTagService {
  constructor(
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly documentsQuery: AdminV2DocumentsRepository,
    private readonly documentsCommands: AdminV2DocumentsCommandsRepository,
  ) {}

  async listTags() {
    const tags = await this.documentsQuery.listTags();

    return {
      items: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        reserved: this.isReservedTag(tag.name),
        usageCount: tag._count.resourceTags,
        createdAt: tag.createdAt.toISOString(),
        updatedAt: tag.updatedAt.toISOString(),
        version: deriveVersion(tag.updatedAt),
      })),
    };
  }

  async createTag(adminId: string, body: { name?: string | null }, meta?: RequestMeta) {
    const name = normalizeTagName(body.name);

    return this.idempotency.execute({
      adminId,
      scope: `document-tag-create:${name}`,
      key: meta?.idempotencyKey,
      payload: { name },
      execute: async () => {
        const existing = await this.documentsQuery.findTagByName(name);

        if (existing) {
          return buildAlreadyExistsTagCreateResult(existing);
        }

        const created = await this.documentsCommands.createTagWithAudit({
          adminId,
          name,
          meta,
        });

        return {
          tagId: created.id,
          name: created.name,
          version: deriveVersion(created.updatedAt),
          updatedAt: created.updatedAt.toISOString(),
          alreadyExists: false,
        };
      },
    });
  }

  async updateTag(
    tagId: string,
    adminId: string,
    body: { name?: string | null; version?: number },
    meta?: RequestMeta,
  ) {
    const name = normalizeTagName(body.name);
    const expectedVersion = parseRequiredVersion(body.version, `Tag version is required`);

    return this.idempotency.execute({
      adminId,
      scope: `document-tag-update:${tagId}`,
      key: meta?.idempotencyKey,
      payload: { tagId, name, expectedVersion },
      execute: async () => {
        const tag = assertTagEditable(assertTagFound(await this.documentsQuery.findTagById(tagId)));
        assertVersionMatches(`Document tag`, tag.updatedAt, expectedVersion);

        const duplicate = await this.documentsQuery.findTagByName(name);
        assertTagNameAvailable(duplicate, tag.id);

        if (tag.name === name) {
          return buildUnchangedTagUpdateResult(tag);
        }

        const fresh = await this.documentsCommands.updateTagWithAudit({
          tag,
          adminId,
          nextName: name,
          meta,
        });

        return {
          tagId: fresh.id,
          name: fresh.name,
          version: deriveVersion(fresh.updatedAt),
          updatedAt: fresh.updatedAt.toISOString(),
          unchanged: false,
        };
      },
    });
  }

  async deleteTag(tagId: string, adminId: string, body: { version?: number; confirmed?: boolean }, meta?: RequestMeta) {
    const expectedVersion = parseRequiredVersion(body.version, `Tag version is required`);
    assertDeleteConfirmed(body.confirmed);

    return this.idempotency.execute({
      adminId,
      scope: `document-tag-delete:${tagId}`,
      key: meta?.idempotencyKey,
      payload: { tagId, expectedVersion, confirmed: true },
      execute: async () => {
        const tag = assertTagEditable(assertTagFound(await this.documentsQuery.findTagById(tagId)));
        assertVersionMatches(`Document tag`, tag.updatedAt, expectedVersion);

        const result = await this.documentsCommands.deleteTagWithAudit({
          tag,
          adminId,
          meta,
        });

        return {
          tagId: result.tagId,
          deleted: true,
          affectedResourceCount: result.affectedResourceCount,
        };
      },
    });
  }

  async loadTagSelection(tagIds: string[]) {
    if (tagIds.length === 0) {
      return [] as Array<{ id: string; name: string }>;
    }

    const tags = await this.documentsQuery.loadTagSelection(tagIds);
    return assertTagSelectionComplete(tags, tagIds);
  }

  isReservedTag(name: string) {
    return isReservedTagName(name);
  }
}
