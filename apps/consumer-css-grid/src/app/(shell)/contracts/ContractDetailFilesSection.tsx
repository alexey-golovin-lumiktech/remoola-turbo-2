import Link from 'next/link';

import { type ContractDetailViewModel } from './contract-detail-model';
import { buildContractFilesWorkspaceHref, buildContractPaymentDetailHref } from './contract-workflow-actions';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { shellContainerBase, shellEmptyState } from '../../../shared/ui/shell-card-tokens';
import { Panel } from '../../../shared/ui/shell-panel';

export function ContractDetailFilesSection({
  returnToContractsHref,
  viewModel,
}: {
  returnToContractsHref: string;
  viewModel: ContractDetailViewModel;
}) {
  return (
    <div id="files">
      <Panel title="Files for this contract" aside={`${viewModel.contract.summary.documentsCount} total`}>
        <div className="mb-4 rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-4 text-sm text-(--app-primary)">
          <div className="font-medium">
            {viewModel.contract.summary.draftPaymentsCount > 0
              ? `Draft file actions stay inside this contract workflow`
              : `Files stay visible here even when no draft is open`}
          </div>
          <div className="mt-1 text-blue-100/80">
            {viewModel.contract.summary.draftPaymentsCount > 0
              ? `Open the contract files workspace to attach existing relationship files to ${viewModel.contract.summary.draftPaymentsCount} draft payment request${viewModel.contract.summary.draftPaymentsCount === 1 ? `` : `s`} without losing this contract context.`
              : `You can open relationship files from this screen. When the next draft payment request is created, attach existing files from the contract files workspace instead of leaving the contract flow.`}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-blue-300/20 px-2 py-1 text-blue-100/80">
              {viewModel.draftLinkedFilesCount} file{viewModel.draftLinkedFilesCount === 1 ? `` : `s`} already linked to
              draft work
            </span>
            {viewModel.contract.summary.draftPaymentsCount > 0 ? (
              <span className="rounded-full border border-(--app-border) px-2 py-1 text-blue-100/80">
                {viewModel.filesWithoutDraftLinkCount} file{viewModel.filesWithoutDraftLinkCount === 1 ? `` : `s`}
                {` `}
                not yet linked to a draft
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={buildContractFilesWorkspaceHref(viewModel.contractId, returnToContractsHref)}
              className="rounded-xl border border-blue-300/20 px-3 py-2 text-sm text-(--app-primary) transition hover:bg-(--app-primary-soft)"
            >
              Open contract files workspace
            </Link>
            {viewModel.latestDraftPaymentId ? (
              <Link
                href={buildContractPaymentDetailHref(
                  viewModel.latestDraftPaymentId,
                  viewModel.contractId,
                  returnToContractsHref,
                )}
                className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
              >
                Open latest draft
              </Link>
            ) : null}
          </div>
        </div>
        {viewModel.contract.summary.documentsCount === 0 ? (
          <div className={shellEmptyState}>No files are attached to this contractor relationship yet.</div>
        ) : (
          <div className="space-y-3">
            {viewModel.documents.map((document) => (
              <div key={document.id} className={shellContainerBase}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-(--app-primary)">
                        <DocumentIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-(--app-text)">{document.name}</div>
                        <div className="mt-1 text-xs text-(--app-text-faint)">{document.id}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-(--app-text-muted)">Added {document.createdAtLabel}</div>
                  </div>
                  <a
                    href={document.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-primary) transition hover:border-(--app-border-strong) hover:text-(--app-primary)"
                  >
                    Open
                  </a>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {viewModel.contract.summary.draftPaymentsCount > 0 && !document.isAttachedToDraftPaymentRequest ? (
                    <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-100">
                      Not linked to current draft work
                    </span>
                  ) : null}
                  {document.isAttachedToDraftPaymentRequest ? (
                    <span className="rounded-full border border-(--app-warning-soft) bg-(--app-warning-soft) px-2 py-1 text-xs text-(--app-warning-text)">
                      Attached to draft payment request
                      {document.attachedDraftPaymentRequestIds.length === 1 ? `` : `s`}
                    </span>
                  ) : null}
                  {document.attachedDraftPaymentRequestIds.map((paymentRequestId, index) => (
                    <Link
                      key={`${document.id}-draft-${paymentRequestId}`}
                      href={buildContractPaymentDetailHref(
                        paymentRequestId,
                        viewModel.contractId,
                        returnToContractsHref,
                      )}
                      className="rounded-full border border-(--app-warning-soft) px-2 py-1 text-xs text-(--app-warning-text) transition hover:border-amber-300/40"
                    >
                      {document.attachedDraftPaymentRequestIds.length === 1 ? `Open draft` : `Open draft ${index + 1}`}
                    </Link>
                  ))}
                  {document.isAttachedToNonDraftPaymentRequest ? (
                    <span className="rounded-full border border-(--app-danger-soft) bg-(--app-danger-soft) px-2 py-1 text-xs text-(--app-danger-text)">
                      Attached to payment record
                      {document.attachedNonDraftPaymentRequestIds.length === 1 ? `` : `s`}
                    </span>
                  ) : null}
                  {document.attachedNonDraftPaymentRequestIds.map((paymentRequestId, index) => (
                    <Link
                      key={`${document.id}-payment-${paymentRequestId}`}
                      href={buildContractPaymentDetailHref(
                        paymentRequestId,
                        viewModel.contractId,
                        returnToContractsHref,
                      )}
                      className="rounded-full border border-(--app-border) px-2 py-1 text-xs text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:text-(--app-text)"
                    >
                      {document.attachedNonDraftPaymentRequestIds.length === 1
                        ? `Open payment`
                        : `Open payment ${index + 1}`}
                    </Link>
                  ))}
                  {document.tags.length === 0 ? (
                    <span className="rounded-full border border-(--app-border) px-2 py-1 text-xs text-(--app-text-faint)">
                      No tags
                    </span>
                  ) : (
                    document.tags.map((tag) => (
                      <span
                        key={`${document.id}-${tag}`}
                        className="rounded-full border border-(--app-primary-soft) bg-(--app-primary-soft) px-2 py-1 text-xs text-(--app-primary)"
                      >
                        {tag}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
