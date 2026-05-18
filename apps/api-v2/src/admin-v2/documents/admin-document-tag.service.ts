import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { AdminV2DocumentsCommandsRepository } from './admin-v2-documents-commands.repository';
import { AdminV2DocumentsRepository } from './admin-v2-documents.repository';
import { type AdminV2RequestMeta as RequestMeta } from '../admin-v2-context.types';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { buildStaleVersionPayload, deriveVersion } from '../admin-v2-version-utils';

const RESERVED_TAG_PREFIX = `INVOICE-`;

function normalizeTagName(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? ``;
  if (!normalized) {
    throw new BadRequestException(`Tag name is required`);
  }
  if (normalized.startsWith(RESERVED_TAG_PREFIX.toLowerCase())) {
    throw new ConflictException(`Reserved invoice tags are system-managed and cannot be changed from Documents`);
  }
  return normalized;
}

function parseVersion(value: number | undefined, errorMessage: string) {
  const version = Number(value);
  if (!Number.isFinite(version) || version < 1) {
    throw new BadRequestException(errorMessage);
  }
  return version;
}

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
          return {
            tagId: existing.id,
            name: existing.name,
            version: deriveVersion(existing.updatedAt),
            updatedAt: existing.updatedAt.toISOString(),
            alreadyExists: true,
          };
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
    const expectedVersion = parseVersion(body.version, `Tag version is required`);

    return this.idempotency.execute({
      adminId,
      scope: `document-tag-update:${tagId}`,
      key: meta?.idempotencyKey,
      payload: { tagId, name, expectedVersion },
      execute: async () => {
        const tag = await this.documentsQuery.findTagById(tagId);

        if (!tag) {
          throw new NotFoundException(`Document tag not found`);
        }
        if (this.isReservedTag(tag.name)) {
          throw new ConflictException(`Reserved invoice tags are system-managed and cannot be changed from Documents`);
        }
        if (deriveVersion(tag.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Document tag`, tag.updatedAt));
        }

        const duplicate = await this.documentsQuery.findTagByName(name);
        if (duplicate && duplicate.id !== tag.id) {
          throw new ConflictException(`Document tag name is already in use`);
        }

        if (tag.name === name) {
          return {
            tagId: tag.id,
            name: tag.name,
            version: deriveVersion(tag.updatedAt),
            updatedAt: tag.updatedAt.toISOString(),
            unchanged: true,
          };
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
    const expectedVersion = parseVersion(body.version, `Tag version is required`);
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for tag deletion`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `document-tag-delete:${tagId}`,
      key: meta?.idempotencyKey,
      payload: { tagId, expectedVersion, confirmed: true },
      execute: async () => {
        const tag = await this.documentsQuery.findTagById(tagId);

        if (!tag) {
          throw new NotFoundException(`Document tag not found`);
        }
        if (this.isReservedTag(tag.name)) {
          throw new ConflictException(`Reserved invoice tags are system-managed and cannot be changed from Documents`);
        }
        if (deriveVersion(tag.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Document tag`, tag.updatedAt));
        }

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

    if (tags.length !== tagIds.length) {
      throw new NotFoundException(`One or more document tags were not found`);
    }

    return tags;
  }

  isReservedTag(name: string) {
    return name.startsWith(RESERVED_TAG_PREFIX);
  }
}
