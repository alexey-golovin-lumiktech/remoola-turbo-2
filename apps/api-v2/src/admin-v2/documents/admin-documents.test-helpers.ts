import { jest } from '@jest/globals';

import { AdminDocumentTagService } from './admin-document-tag.service';
import { AdminDocumentTaggerService } from './admin-document-tagger.service';
import { AdminDocumentService as AdminDocumentServiceBase } from './admin-document.service';
import { AdminV2DocumentsCommandsRepository } from './admin-v2-documents-commands.repository';
import { AdminV2DocumentsRepository } from './admin-v2-documents.repository';

type TestPrismaLike = {
  $transaction: (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
};

type TestStorageLike = unknown;

type TestIdempotencyLike = unknown;

type TestAssignmentContext = {
  current: unknown | null;
  history: unknown[];
};

type TestAssignmentsServiceLike = {
  getAssignmentContextForResource: (resource: string, resourceId: string) => Promise<TestAssignmentContext>;
  getActiveAssigneesForResource: (resource: string, resourceIds: string[]) => Promise<Map<string, unknown>>;
};

export class TestAdminDocumentService extends AdminDocumentServiceBase {
  readonly tagService: AdminDocumentTagService;
  readonly taggerService: AdminDocumentTaggerService;

  constructor(
    prisma: TestPrismaLike,
    storage: TestStorageLike,
    idempotency: TestIdempotencyLike,
    assignmentsService: TestAssignmentsServiceLike,
  ) {
    const documentsQuery = new AdminV2DocumentsRepository(
      prisma as never,
      {
        run: (callback: (tx: unknown) => Promise<unknown>) => prisma.$transaction(callback as never),
      } as never,
    );
    const documentsCommands = new AdminV2DocumentsCommandsRepository(
      prisma as never,
      {
        run: (callback: (tx: unknown) => Promise<unknown>) => prisma.$transaction(callback as never),
      } as never,
    );
    const tagService = new AdminDocumentTagService(idempotency as never, documentsQuery, documentsCommands);
    const taggerService = new AdminDocumentTaggerService(
      idempotency as never,
      documentsQuery,
      documentsCommands,
      tagService,
    );
    super(storage as never, assignmentsService as never, documentsQuery);
    this.tagService = tagService;
    this.taggerService = taggerService;
  }
}

export function createIdempotency() {
  return {
    execute: jest.fn<(params: { execute: () => Promise<unknown> }) => Promise<unknown>>(
      async ({ execute }: { execute: () => Promise<unknown> }) => execute(),
    ),
  };
}

export function createAssignmentsService() {
  return {
    getAssignmentContextForResource: jest.fn<(resource: string, resourceId: string) => Promise<TestAssignmentContext>>(
      async () => ({ current: null, history: [] }),
    ),
    getActiveAssigneesForResource: jest.fn<(resource: string, resourceIds: string[]) => Promise<Map<string, unknown>>>(
      async () => new Map(),
    ),
  };
}
