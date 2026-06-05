import { type DocumentsPageParams } from './page.params';
import { getDocuments, getDocumentTags } from '../../../lib/admin-api/documents.server';
import { getAdminIdentity } from '../../../lib/admin-api/identity.server';
import { ADMIN_CAPABILITIES, hasAdminCapability } from '../../../lib/admin-capabilities';

export type DocumentsPageData = {
  params: DocumentsPageParams;
  identity: Awaited<ReturnType<typeof getAdminIdentity>>;
  documents: Awaited<ReturnType<typeof getDocuments>>;
  tags: Awaited<ReturnType<typeof getDocumentTags>>;
  canManage: boolean;
};

export async function loadDocumentsPage(params: DocumentsPageParams): Promise<DocumentsPageData> {
  const { query, page, includeDeleted } = params;
  const [identity, documents, tags] = await Promise.all([
    getAdminIdentity(),
    getDocuments({
      page,
      q: query.q,
      consumerId: query.consumerId,
      access: query.access,
      mimetype: query.mimetype,
      sizeMin: query.sizeMin,
      sizeMax: query.sizeMax,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      paymentRequestId: query.paymentRequestId,
      tag: query.tag,
      tagId: query.tagId,
      includeDeleted,
    }),
    getDocumentTags(),
  ]);
  const canManage = hasAdminCapability(identity, ADMIN_CAPABILITIES.documentsManage);

  return { params, identity, documents, tags, canManage };
}
