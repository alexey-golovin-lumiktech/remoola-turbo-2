export function getAdminDocumentDownloadHref(resourceId: string): string {
  return `/api/admin-v2/documents/${encodeURIComponent(resourceId)}/download`;
}
