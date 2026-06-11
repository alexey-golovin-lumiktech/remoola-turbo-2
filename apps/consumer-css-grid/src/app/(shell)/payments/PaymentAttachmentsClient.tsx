'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';

import { getPaymentAttachmentsLibraryState } from './payment-attachments-library-state';
import { buildPaymentDocumentsHref } from './payment-flow-context';
import { PaymentAttachmentsLibrarySection } from './PaymentAttachmentsLibrarySection';
import { PaymentAttachmentsList } from './PaymentAttachmentsList';
import { PaymentAttachmentsUploadForm } from './PaymentAttachmentsUploadForm';
import { SESSION_EXPIRED_ERROR_CODE } from '../../../lib/auth-failure';
import {
  attachDocumentsToPaymentRequestMutation,
  detachDocumentFromPaymentRequestMutation,
} from '../../../lib/mutations/payments.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';

type Attachment = {
  id: string;
  name: string;
  downloadUrl: string;
  size: number;
  createdAt: string;
};

type AvailableDocument = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  kind: string;
  tags: string[];
};

type Props = {
  paymentRequestId: string;
  role: string;
  status: string;
  attachments: Attachment[];
  availableDocuments: AvailableDocument[];
  availableDocumentsTotal: number;
  availableDocumentsPage: number;
  availableDocumentsPageSize: number;
  contractId?: string | null;
  returnTo?: string | null;
};

async function uploadDocuments(formData: FormData) {
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
        message: `Attachment upload could not be completed because the network request failed. Please try again.`,
      },
    };
  }
}

export function PaymentAttachmentsClient({
  paymentRequestId,
  role,
  status,
  attachments,
  availableDocuments,
  availableDocumentsTotal,
  availableDocumentsPage,
  availableDocumentsPageSize,
  contractId,
  returnTo,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: `success` | `error`; text: string } | null>(null);

  const canAttach = role.toUpperCase() === `REQUESTER` && status.toUpperCase() === `DRAFT`;
  const attachedIds = useMemo(() => new Set(attachments.map((attachment) => attachment.id)), [attachments]);
  const attachableDocuments = useMemo(
    () => availableDocuments.filter((document) => !attachedIds.has(document.id)),
    [attachedIds, availableDocuments],
  );
  const showHistoricalRecordNotice = !canAttach && attachments.length > 0;
  const attachmentLibraryState = getPaymentAttachmentsLibraryState({
    availableDocumentsCount: availableDocuments.length,
    attachableDocumentsCount: attachableDocuments.length,
    availableDocumentsTotal,
    availableDocumentsPage,
    availableDocumentsPageSize,
  });
  const availableDocumentPages = attachmentLibraryState.totalPages;
  const hasAnyAvailable = availableDocumentsTotal > 0 || availableDocuments.length > 0;
  const documentsHref = useMemo(
    () => buildPaymentDocumentsHref({ contractId: contractId ?? undefined, returnTo: returnTo ?? undefined }),
    [contractId, returnTo],
  );

  const applyDocumentPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(`attachmentPage`, String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleUpload = () => {
    const files = uploadInputRef.current?.files;
    const formData = new FormData();
    if (files) {
      for (const file of Array.from(files)) {
        formData.append(`files`, file);
      }
    }
    formData.append(`paymentRequestId`, paymentRequestId);
    setMessage(null);
    startTransition(async () => {
      const result = await uploadDocuments(formData);
      if (!result.ok) {
        if (handleSessionExpiredError(result.error)) return;
        setMessage({ type: `error`, text: result.error.message });
        return;
      }
      if (uploadInputRef.current) {
        uploadInputRef.current.value = ``;
      }
      setSelectedFiles([]);
      setMessage({ type: `success`, text: `Attachment uploaded` });
      router.refresh();
    });
  };

  const handleToggleDocument = (documentId: string, checked: boolean) => {
    setSelectedDocumentIds((current) =>
      checked ? [...current, documentId] : current.filter((currentId) => currentId !== documentId),
    );
    setMessage(null);
  };

  const handleAttachSelected = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await attachDocumentsToPaymentRequestMutation(paymentRequestId, selectedDocumentIds);
      if (!result.ok) {
        if (handleSessionExpiredError(result.error)) return;
        setMessage({ type: `error`, text: result.error.message });
        return;
      }
      setSelectedDocumentIds([]);
      setMessage({ type: `success`, text: result.message ?? `Documents attached` });
      router.refresh();
    });
  };

  const handleRemoveAttachment = (attachment: Attachment) => {
    setMessage(null);
    setRemovingAttachmentId(attachment.id);
    startTransition(async () => {
      const result = await detachDocumentFromPaymentRequestMutation(paymentRequestId, attachment.id);
      setRemovingAttachmentId(null);
      if (!result.ok) {
        if (handleSessionExpiredError(result.error)) return;
        setMessage({ type: `error`, text: result.error.message });
        return;
      }
      setMessage({ type: `success`, text: result.message ?? `Attachment removed from draft` });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {canAttach ? (
        <div className="space-y-4">
          <PaymentAttachmentsUploadForm
            documentsButtonLabel={contractId ? `Open contract files` : `Open document library`}
            documentsHref={documentsHref}
            isPending={isPending}
            onFilesSelected={(fileNames) => {
              setSelectedFiles(fileNames);
              setMessage(null);
            }}
            onUpload={handleUpload}
            selectedFiles={selectedFiles}
            uploadInputRef={uploadInputRef}
          />

          <PaymentAttachmentsLibrarySection
            attachableDocuments={attachableDocuments}
            attachmentLibraryState={attachmentLibraryState}
            availableDocumentPages={availableDocumentPages}
            availableDocumentsPage={availableDocumentsPage}
            hasAnyAvailable={hasAnyAvailable}
            isPending={isPending}
            onAttachSelected={handleAttachSelected}
            onNextPage={() => applyDocumentPage(availableDocumentsPage + 1)}
            onPrevPage={() => applyDocumentPage(availableDocumentsPage - 1)}
            onToggleDocument={handleToggleDocument}
            selectedDocumentIds={selectedDocumentIds}
          />
        </div>
      ) : null}

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.type === `error`
              ? `border-(--app-danger-soft) bg-(--app-danger-soft) text-(--app-danger-text)`
              : `border-(--app-success-soft) bg-(--app-success-soft) text-(--app-success-text)`
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {showHistoricalRecordNotice ? (
        <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
          These files are part of this payment record now. You can review them here, but attachments can only be added
          or removed while the request is still a draft.
        </div>
      ) : null}

      <PaymentAttachmentsList
        attachments={attachments}
        canAttach={canAttach}
        isPending={isPending}
        onRemove={handleRemoveAttachment}
        removingAttachmentId={removingAttachmentId}
      />
    </div>
  );
}
