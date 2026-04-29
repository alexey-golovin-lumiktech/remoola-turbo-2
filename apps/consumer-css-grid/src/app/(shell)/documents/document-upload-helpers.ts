import { SESSION_EXPIRED_ERROR_CODE } from '../../../lib/auth-failure';

export function getSelectedFilesMessage(selectedFiles: string[]) {
  if (selectedFiles.length === 0) return `Choose one or more files before uploading.`;
  return `${selectedFiles.length} file${selectedFiles.length === 1 ? `` : `s`} selected: ${selectedFiles.join(`, `)}`;
}

export function buildDocumentUploadFormData(files: FileList | null | undefined) {
  const formData = new FormData();
  if (!files) return formData;

  for (const file of Array.from(files)) {
    formData.append(`files`, file);
  }

  return formData;
}

export async function uploadDocuments(formData: FormData) {
  try {
    const response = await fetch(`/api/documents/upload`, {
      method: `POST`,
      body: formData,
      cache: `no-store`,
      credentials: `include`,
    });
    const payload = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;

    if (!response.ok) {
      return {
        ok: false as const,
        error: {
          code: response.status === 401 ? SESSION_EXPIRED_ERROR_CODE : (payload?.code ?? `API_ERROR`),
          message:
            response.status === 401
              ? `Your session has expired. Please sign in again.`
              : (payload?.message ?? `Failed to upload document`),
        },
      };
    }

    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: {
        code: `NETWORK_ERROR`,
        message: `Document upload could not be completed because the network request failed. Please try again.`,
      },
    };
  }
}
