import { Injectable, NotFoundException } from '@nestjs/common';

import {
  buildListDocumentsWhere,
  mapDocumentCase,
  mapDocumentListItem,
  normalizePage,
  normalizePageSize,
  type AdminDocumentListParams,
} from './admin-document-read.helpers';
import { AdminV2DocumentsRepository } from './admin-v2-documents.repository';
import { buildDocumentEvidenceScopeWhere } from './document-query-helpers';
import { FileStorageService } from '../../infrastructure/storage/file-storage.service';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';

@Injectable()
export class AdminDocumentService {
  constructor(
    private readonly storage: FileStorageService,
    private readonly assignmentsService: AdminV2AssignmentsService,
    private readonly documentsQuery: AdminV2DocumentsRepository,
  ) {}

  async listDocuments(params?: AdminDocumentListParams) {
    const page = normalizePage(params?.page);
    const pageSize = normalizePageSize(params?.pageSize);
    const where = buildListDocumentsWhere(params);

    const [items, total] = await Promise.all([
      this.documentsQuery.findMany(where, page, pageSize),
      this.documentsQuery.count(where),
    ]);

    const assigneeMap = await this.assignmentsService.getActiveAssigneesForResource(
      `document`,
      items.map((resource) => resource.id),
    );

    return {
      items: items.map((resource) => mapDocumentListItem(resource, assigneeMap.get(resource.id) ?? null)),
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

    return mapDocumentCase(resource, assignment, backendBaseUrl);
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
}
