import { buildConsumerDocumentDownloadUrl } from '../../../shared/consumer-document-download-url';

export type ConsumerDocumentListItem = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
  mimetype: string | null;
  kind: string;
  tags: string[];
  isAttachedToDraftPaymentRequest: boolean;
  attachedDraftPaymentRequestIds: string[];
  isAttachedToNonDraftPaymentRequest: boolean;
  attachedNonDraftPaymentRequestIds: string[];
};

export type ConsumerDocumentListRow = {
  id: string;
  name: string;
  size: number | bigint;
  createdAt: Date;
  mimetype: string | null;
  kind: string;
  tags: string[] | null;
  attachedDraftPaymentRequestIds: string[] | null;
  attachedNonDraftPaymentRequestIds: string[] | null;
  totalCount: number | bigint;
};

export function formatConsumerDocumentListRows(
  rows: ConsumerDocumentListRow[],
  backendBaseUrl?: string,
): { items: ConsumerDocumentListItem[]; total: number } {
  const total = rows.length > 0 ? Number(rows[0].totalCount) : 0;

  return {
    items: rows.map((row) => {
      const attachedDraftPaymentRequestIds = row.attachedDraftPaymentRequestIds ?? [];
      const attachedNonDraftPaymentRequestIds = row.attachedNonDraftPaymentRequestIds ?? [];

      return {
        id: row.id,
        name: row.name,
        size: Number(row.size),
        createdAt: row.createdAt.toISOString(),
        downloadUrl: buildConsumerDocumentDownloadUrl(row.id, backendBaseUrl),
        mimetype: row.mimetype,
        kind: row.kind,
        tags: row.tags ?? [],
        isAttachedToDraftPaymentRequest: attachedDraftPaymentRequestIds.length > 0,
        attachedDraftPaymentRequestIds,
        isAttachedToNonDraftPaymentRequest: attachedNonDraftPaymentRequestIds.length > 0,
        attachedNonDraftPaymentRequestIds,
      };
    }),
    total,
  };
}
