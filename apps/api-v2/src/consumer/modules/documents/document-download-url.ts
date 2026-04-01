import { resolveEmailApiBaseUrl } from '../../../shared/resolve-email-api-base-url';

function resolveApiOrigin(backendBaseUrl?: string): string {
  if (backendBaseUrl && backendBaseUrl.trim()) {
    return backendBaseUrl.replace(/\/$/, ``);
  }

  return resolveEmailApiBaseUrl().replace(/\/api\/?$/, ``);
}

export function buildConsumerDocumentDownloadUrl(resourceId: string, backendBaseUrl?: string): string {
  return new URL(`/api/consumer/documents/${resourceId}/download`, resolveApiOrigin(backendBaseUrl)).toString();
}
