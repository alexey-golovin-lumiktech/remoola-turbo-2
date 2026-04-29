const DOCUMENT_DOWNLOAD_PROXY_PREFIX = `/api/documents`;

function buildDocumentDownloadProxyUrl(resourceId: string): string {
  return `${DOCUMENT_DOWNLOAD_PROXY_PREFIX}/${encodeURIComponent(resourceId)}/download`;
}

export function normalizeDocumentDownloadUrl(
  downloadUrl: string | null | undefined,
  resourceId: string | null | undefined,
): string {
  const normalizedResourceId = resourceId?.trim();
  if (normalizedResourceId) {
    return buildDocumentDownloadProxyUrl(normalizedResourceId);
  }

  return downloadUrl?.trim() ?? ``;
}
