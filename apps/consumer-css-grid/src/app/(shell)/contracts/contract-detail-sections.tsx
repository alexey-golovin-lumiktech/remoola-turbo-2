import Link from 'next/link';
import { type ReactNode } from 'react';

import { type ContractDetailViewModel } from './contract-detail-model';
import { buildContractFilesWorkspaceHref, buildContractPaymentDetailHref } from './contract-workflow-actions';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { UsersIcon } from '../../../shared/ui/icons/UsersIcon';
import { MetricLine } from '../../../shared/ui/shell-data-display';
import { shellGridDetail3 } from '../../../shared/ui/shell-grid-tokens';
import { StatusPill } from '../../../shared/ui/shell-indicators';
import { shellMainAsideBalanced } from '../../../shared/ui/shell-layout-tokens';
import { Panel } from '../../../shared/ui/shell-panel';

type Props = {
  inlineActions?: ReactNode;
  returnToContractsHref: string;
  viewModel: ContractDetailViewModel;
};

export function ContractDetailSections({ inlineActions, returnToContractsHref, viewModel }: Props) {
  return (
    <section className={shellMainAsideBalanced}>
      <div className="space-y-5">
        <section className="rounded-[28px] border border-(--app-border) bg-(--app-card-gradient) p-5 shadow-(--app-shadow)">
          <div className="grid grid-cols-[auto_1fr] gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-(--app-primary) shadow-(--app-shadow)">
              <span className="text-2xl font-semibold text-(--app-primary-contrast)">{viewModel.initials}</span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold tracking-tight text-(--app-text)">{viewModel.contractTitle}</h2>
                <StatusPill status={viewModel.summaryStatusLabel} />
              </div>
              <div className="mt-2 text-sm text-(--app-text-muted)">
                Dedicated contract workspace powered by a contract-scoped backend details model rather than the old
                contact-centric details endpoint.
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Contractor</div>
                  <div className="mt-2 break-all text-sm text-(--app-primary)">{viewModel.emailLabel}</div>
                </div>
                <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">
                    Relationship summary
                  </div>
                  <div className="mt-2 text-sm text-(--app-text-soft)">{viewModel.relationshipSummaryLabel}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={shellGridDetail3}>
          <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Payment history</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-text)">
              {viewModel.contract.summary.paymentsCount}
            </div>
            <div className="mt-2 text-sm text-(--app-text-muted)">Requests currently connected to this contractor</div>
          </div>
          <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Completed</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-success-text)">
              {viewModel.contract.summary.completedPaymentsCount}
            </div>
            <div className="mt-2 text-sm text-(--app-text-muted)">
              Effective completed outcomes inside this relationship
            </div>
          </div>
          <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Files</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-text)">
              {viewModel.contract.summary.documentsCount}
            </div>
            <div className="mt-2 text-sm text-(--app-text-muted)">
              Documents linked to payment records for this contractor
            </div>
          </div>
        </section>

        <section className={shellGridDetail3}>
          <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Drafts</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-amber-200">
              {viewModel.contract.summary.draftPaymentsCount}
            </div>
            <div className="mt-2 text-sm text-(--app-text-muted)">
              Requester-side drafts still open for this relationship
            </div>
          </div>
          <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Pending</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-(--app-primary)">
              {viewModel.contract.summary.pendingPaymentsCount}
            </div>
            <div className="mt-2 text-sm text-(--app-text-muted)">Payments still waiting for a payer-side action</div>
          </div>
          <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Waiting</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-indigo-200">
              {viewModel.contract.summary.waitingPaymentsCount}
            </div>
            <div className="mt-2 text-sm text-(--app-text-muted)">
              In-flight settlements already moving through the rail
            </div>
          </div>
        </section>

        <Panel title="Relationship timeline" aside={`${viewModel.timelineCount} visible`}>
          {viewModel.timelineCount === 0 ? (
            <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
              No relationship events yet.
            </div>
          ) : (
            <div className="space-y-3">
              {viewModel.timeline.map((event) => (
                <div key={event.id} className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-(--app-text)">{event.title}</div>
                        {event.statusLabel ? <StatusPill status={event.statusLabel} /> : null}
                      </div>
                      <div className="mt-2 text-sm text-(--app-text-muted)">{event.detail}</div>
                    </div>
                    <div className="text-sm text-(--app-text-muted)">{event.createdAtLabel}</div>
                  </div>
                  {event.href ? (
                    <div className="mt-3">
                      <Link
                        href={event.href}
                        className="text-sm text-(--app-primary) transition hover:text-(--app-primary)"
                      >
                        Open related workflow
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Payment history for this contract" aside={`${viewModel.contract.summary.paymentsCount} total`}>
          <div className="mb-4 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
            Each payment row stays linked to the existing payment detail route, but this screen frames the activity as
            one contractor relationship.
          </div>
          {viewModel.contract.summary.paymentsCount === 0 ? (
            <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
              No payment history for this contract yet.
            </div>
          ) : (
            <div className="space-y-3">
              {viewModel.paymentItems.map((payment) => (
                <Link
                  key={payment.id}
                  href={payment.href}
                  className="block rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4 transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-(--app-text)">Payment request</div>
                        <StatusPill status={payment.statusLabel} />
                      </div>
                      <div className="mt-2 text-sm text-(--app-text-muted)">Created {payment.createdAtLabel}</div>
                      <div className="mt-2 text-xs text-(--app-text-faint)">{payment.id}</div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-sm text-(--app-text-muted)">Amount</div>
                      <div className="mt-1 text-lg font-medium text-(--app-text)">{payment.amount}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="Relationship summary">
          <div className="space-y-3">
            <MetricLine label="Contractor email" value={viewModel.emailLabel} />
            <MetricLine label="Address" value={viewModel.addressLabel} />
            <MetricLine
              label="Latest activity"
              value={
                viewModel.contract.summary.lastActivity
                  ? viewModel.relationshipSummaryLabel.replace(`Latest relationship activity `, ``)
                  : `—`
              }
            />
            <MetricLine label="Relationship status" value={viewModel.summaryStatusLabel} />
            <MetricLine label="Latest payment" value={viewModel.latestPaymentLabel} />
            <MetricLine label="Files linked" value={`${viewModel.contract.summary.documentsCount}`} />
          </div>
          <div className="mt-4 rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-3 text-sm text-(--app-primary)">
            <div className="font-medium">{viewModel.readiness.label}</div>
            <div className="mt-1 text-blue-100/80">{viewModel.readiness.description}</div>
          </div>
        </Panel>

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
                  {viewModel.draftLinkedFilesCount} file{viewModel.draftLinkedFilesCount === 1 ? `` : `s`} already
                  linked to draft work
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
              <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
                No files are attached to this contractor relationship yet.
              </div>
            ) : (
              <div className="space-y-3">
                {viewModel.documents.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4"
                  >
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
                      {viewModel.contract.summary.draftPaymentsCount > 0 &&
                      !document.isAttachedToDraftPaymentRequest ? (
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
                          {document.attachedDraftPaymentRequestIds.length === 1
                            ? `Open draft`
                            : `Open draft ${index + 1}`}
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

        <Panel
          title="Active workflow"
          aside={viewModel.operatingPayment ? viewModel.summaryStatusLabel : `No activity`}
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-3 text-sm text-(--app-primary)">
              {viewModel.activeWorkflow.title}
            </div>
            <div className="text-sm text-(--app-text-soft)">{viewModel.activeWorkflow.detail}</div>
            <Link
              href={viewModel.activeWorkflow.primaryAction.href}
              className="flex items-center gap-3 rounded-2xl border border-(--app-primary)/20 bg-(--app-primary-soft) px-4 py-3 text-sm text-(--app-primary) transition hover:opacity-90"
            >
              <DocumentIcon className="h-5 w-5 text-(--app-primary)" />
              {viewModel.activeWorkflow.primaryAction.label}
            </Link>
            {inlineActions}
            <div className="grid grid-cols-1 gap-3">
              {viewModel.activeWorkflowSecondaryActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
                >
                  {action.label.includes(`contact`) ? (
                    <UsersIcon className="h-5 w-5 text-(--app-primary)" />
                  ) : (
                    <DocumentIcon className="h-5 w-5 text-(--app-primary)" />
                  )}
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </section>
  );
}
