import Link from 'next/link';

import {
  buildContractFilesWorkspaceHref,
  buildContractPaymentDetailHref,
  buildContractPaymentFlowContext,
  buildEditContactHref,
  resolveContractWorkflowActions,
} from './contract-workflow-actions';
import { ContractInlineActionsClient } from './ContractInlineActionsClient';
import { type ContractDetailsResponse } from '../../../lib/consumer-api.server';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { UsersIcon } from '../../../shared/ui/icons/UsersIcon';
import { MetricLine, Panel, StatusPill } from '../../../shared/ui/shell-primitives';

function formatDateTime(value: string | null | undefined) {
  if (!value) return `—`;
  return new Date(value).toLocaleString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
    hour: `2-digit`,
    minute: `2-digit`,
  });
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return `—`;
  return new Date(value).toLocaleDateString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
  });
}

function formatStatusLabel(status: string | null | undefined) {
  if (!status) return `No activity`;
  return status
    .toLowerCase()
    .split(`_`)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(` `);
}

function formatAddress(contract: ContractDetailsResponse | null) {
  if (!contract?.address) return `No address details`;
  const parts = [
    contract.address.street,
    contract.address.city,
    contract.address.state,
    contract.address.postalCode,
    contract.address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(`, `) : `No address details`;
}

function getContractTitle(contract: ContractDetailsResponse | null, contractId: string) {
  return contract?.name || contract?.email || `Contract ${contractId.slice(0, 8)}`;
}

function getInitials(contract: ContractDetailsResponse | null, contractId: string) {
  const seed = contract?.name?.trim() || contract?.email?.trim() || contractId.slice(0, 2);
  const parts = seed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ``}${parts[parts.length - 1]?.[0] ?? ``}`.toUpperCase();
  }
  return seed.slice(0, 2).toUpperCase();
}

type RelationshipTimelineItem = {
  id: string;
  createdAt: string;
  title: string;
  detail: string;
  href?: string;
  status?: string;
};

const OPERATING_PAYMENT_STATUS_PRIORITY = [`draft`, `pending`, `waiting`] as const;

function getLatestPayment(payments: ContractDetailsResponse[`payments`]) {
  return (
    [...payments].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0] ??
    null
  );
}

function getOperatingPayment(payments: ContractDetailsResponse[`payments`]) {
  const orderedPayments = [...payments].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
  for (const status of OPERATING_PAYMENT_STATUS_PRIORITY) {
    const matchingPayment = orderedPayments.find((payment) => payment.status.trim().toLowerCase() === status);
    if (matchingPayment) {
      return matchingPayment;
    }
  }
  return orderedPayments[0] ?? null;
}

function buildRelationshipTimeline(
  contract: ContractDetailsResponse,
  contractId: string,
  returnToContractsHref?: string,
): RelationshipTimelineItem[] {
  const items: RelationshipTimelineItem[] = [
    {
      id: `contract-updated-${contractId}`,
      createdAt: contract.updatedAt,
      title: `Contact profile updated`,
      detail: `Saved contractor details were updated for this relationship.`,
      href: buildEditContactHref(contractId, returnToContractsHref),
    },
  ];

  for (const payment of contract.payments) {
    items.push({
      id: `payment-created-${payment.id}`,
      createdAt: payment.createdAt,
      title: `Payment request created`,
      detail: `${payment.amount} · ${formatStatusLabel(payment.status)}`,
      href: buildContractPaymentDetailHref(payment.id, contractId, returnToContractsHref),
      status: formatStatusLabel(payment.status),
    });

    if (payment.updatedAt !== payment.createdAt) {
      items.push({
        id: `payment-status-${payment.id}`,
        createdAt: payment.updatedAt,
        title: `Payment status updated`,
        detail: `Current state: ${formatStatusLabel(payment.status)}`,
        href: buildContractPaymentDetailHref(payment.id, contractId, returnToContractsHref),
        status: formatStatusLabel(payment.status),
      });
    }
  }

  for (const document of contract.documents) {
    items.push({
      id: `document-added-${document.id}`,
      createdAt: document.createdAt,
      title: `File added to relationship`,
      detail: document.name,
      href: buildContractFilesWorkspaceHref(contractId, returnToContractsHref),
    });
  }

  return items
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 12);
}

function describeOperationalReadiness(status: string | null | undefined, paymentsCount: number) {
  if (paymentsCount === 0 || !status) {
    return {
      label: `Ready to request payment`,
      description: `No active workflow is running for this relationship yet.`,
    };
  }
  if (status === `draft`) {
    return {
      label: `Draft requires requester action`,
      description: `A draft exists and can be reviewed or sent from this workspace.`,
    };
  }
  if (status === `pending`) {
    return {
      label: `Waiting for payer action`,
      description: `The current request is pending and needs payer-side completion.`,
    };
  }
  if (status === `waiting`) {
    return {
      label: `In settlement`,
      description: `A payment is in-flight; continue tracking via payment detail.`,
    };
  }
  return {
    label: `Ready for next request`,
    description: `The latest workflow is closed and this relationship can start a new payment.`,
  };
}

type Props = {
  contract: ContractDetailsResponse | null;
  contractId: string;
  returnToContractsHref?: string;
};

export function ContractDetailView({ contract, contractId, returnToContractsHref = `/contracts` }: Props) {
  const payments = [...(contract?.payments ?? [])].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
  const timeline = contract ? buildRelationshipTimeline(contract, contractId, returnToContractsHref) : [];
  const latestPayment = getLatestPayment(payments);
  const operatingPayment = getOperatingPayment(payments);
  const latestDraftPayment = payments.find((payment) => payment.status.trim().toUpperCase() === `DRAFT`) ?? null;
  const summaryStatus = formatStatusLabel(operatingPayment?.status ?? contract?.summary.lastStatus);
  const activeWorkflow = contract
    ? resolveContractWorkflowActions({
        contractId,
        email: contract.email,
        status: operatingPayment?.status ?? contract.summary.lastStatus,
        lastRequestId: operatingPayment?.id ?? contract.summary.lastRequestId,
        returnToContractsHref,
      })
    : null;
  const activeWorkflowSecondaryActions = activeWorkflow
    ? [
        ...activeWorkflow.secondaryActions,
        { label: `Open contract files`, href: buildContractFilesWorkspaceHref(contractId, returnToContractsHref) },
        { label: `Edit saved contact`, href: buildEditContactHref(contractId, returnToContractsHref) },
      ]
    : [];
  const readiness = contract
    ? describeOperationalReadiness(
        operatingPayment?.status ?? contract.summary.lastStatus,
        contract.summary.paymentsCount,
      )
    : null;
  const draftLinkedFilesCount =
    contract?.documents.filter((document) => document.isAttachedToDraftPaymentRequest).length ?? 0;
  const filesWithoutDraftLinkCount =
    contract && contract.summary.draftPaymentsCount > 0
      ? contract.documents.filter((document) => !document.isAttachedToDraftPaymentRequest).length
      : 0;

  if (!contract) {
    return (
      <Panel title="Contract workspace">
        <div className="space-y-4">
          <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
            Contract details are unavailable for this relationship.
          </div>
          <Link
            href={returnToContractsHref}
            className="inline-flex text-sm text-(--app-primary) hover:text-(--app-primary-strong)"
          >
            Back to contracts
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="mb-1">
        <Link href={returnToContractsHref} className="text-sm text-(--app-primary) hover:text-(--app-primary-strong)">
          Back to contracts
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <section className="rounded-[28px] border border-(--app-border) bg-(--app-card-gradient) p-5 shadow-(--app-shadow)">
            <div className="grid grid-cols-[auto_1fr] gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-(--app-primary) shadow-(--app-shadow)">
                <span className="text-2xl font-semibold text-(--app-primary-contrast)">
                  {getInitials(contract, contractId)}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-semibold tracking-tight text-(--app-text)">
                    {getContractTitle(contract, contractId)}
                  </h2>
                  <StatusPill status={summaryStatus} />
                </div>
                <div className="mt-2 text-sm text-(--app-text-muted)">
                  Dedicated contract workspace powered by a contract-scoped backend details model rather than the old
                  contact-centric details endpoint.
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Contractor</div>
                    <div className="mt-2 break-all text-sm text-(--app-primary)">
                      {contract.email || `No email available`}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">
                      Relationship summary
                    </div>
                    <div className="mt-2 text-sm text-(--app-text-soft)">
                      {contract.summary.lastActivity
                        ? `Latest relationship activity ${formatDateTime(contract.summary.lastActivity)}`
                        : `No payment activity yet`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Payment history</div>
              <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-text)">
                {contract.summary.paymentsCount}
              </div>
              <div className="mt-2 text-sm text-(--app-text-muted)">
                Requests currently connected to this contractor
              </div>
            </div>
            <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Completed</div>
              <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-success-text)">
                {contract.summary.completedPaymentsCount}
              </div>
              <div className="mt-2 text-sm text-(--app-text-muted)">
                Effective completed outcomes inside this relationship
              </div>
            </div>
            <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Files</div>
              <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-text)">
                {contract.summary.documentsCount}
              </div>
              <div className="mt-2 text-sm text-(--app-text-muted)">
                Documents linked to payment records for this contractor
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Drafts</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-amber-200">
                {contract.summary.draftPaymentsCount}
              </div>
              <div className="mt-2 text-sm text-(--app-text-muted)">
                Requester-side drafts still open for this relationship
              </div>
            </div>
            <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Pending</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-(--app-primary)">
                {contract.summary.pendingPaymentsCount}
              </div>
              <div className="mt-2 text-sm text-(--app-text-muted)">Payments still waiting for a payer-side action</div>
            </div>
            <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Waiting</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-indigo-200">
                {contract.summary.waitingPaymentsCount}
              </div>
              <div className="mt-2 text-sm text-(--app-text-muted)">
                In-flight settlements already moving through the rail
              </div>
            </div>
          </section>

          <Panel title="Relationship timeline" aside={`${timeline.length} visible`}>
            {timeline.length === 0 ? (
              <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
                No relationship events yet.
              </div>
            ) : (
              <div className="space-y-3">
                {timeline.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-(--app-text)">{event.title}</div>
                          {event.status ? <StatusPill status={event.status} /> : null}
                        </div>
                        <div className="mt-2 text-sm text-(--app-text-muted)">{event.detail}</div>
                      </div>
                      <div className="text-sm text-(--app-text-muted)">{formatDateTime(event.createdAt)}</div>
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

          <Panel title="Payment history for this contract" aside={`${contract.summary.paymentsCount} total`}>
            <div className="mb-4 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
              Each payment row stays linked to the existing payment detail route, but this screen frames the activity as
              one contractor relationship.
            </div>
            {contract.summary.paymentsCount === 0 ? (
              <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
                No payment history for this contract yet.
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <Link
                    key={payment.id}
                    href={buildContractPaymentDetailHref(payment.id, contractId, returnToContractsHref)}
                    className="block rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4 transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-(--app-text)">Payment request</div>
                          <StatusPill status={formatStatusLabel(payment.status)} />
                        </div>
                        <div className="mt-2 text-sm text-(--app-text-muted)">
                          Created {formatDateOnly(payment.createdAt)}
                        </div>
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
              <MetricLine label="Contractor email" value={contract.email?.trim() || `No email available`} />
              <MetricLine label="Address" value={formatAddress(contract)} />
              <MetricLine
                label="Latest activity"
                value={contract.summary.lastActivity ? formatDateTime(contract.summary.lastActivity) : `—`}
              />
              <MetricLine label="Relationship status" value={summaryStatus} />
              <MetricLine
                label="Latest payment"
                value={latestPayment ? formatDateTime(latestPayment.updatedAt) : `—`}
              />
              <MetricLine label="Files linked" value={`${contract.summary.documentsCount}`} />
            </div>
            {readiness ? (
              <div className="mt-4 rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-3 text-sm text-(--app-primary)">
                <div className="font-medium">{readiness.label}</div>
                <div className="mt-1 text-blue-100/80">{readiness.description}</div>
              </div>
            ) : null}
          </Panel>

          <div id="files">
            <Panel title="Files for this contract" aside={`${contract.summary.documentsCount} total`}>
              <div className="mb-4 rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-4 text-sm text-(--app-primary)">
                <div className="font-medium">
                  {contract.summary.draftPaymentsCount > 0
                    ? `Draft file actions stay inside this contract workflow`
                    : `Files stay visible here even when no draft is open`}
                </div>
                <div className="mt-1 text-blue-100/80">
                  {contract.summary.draftPaymentsCount > 0
                    ? `Open the contract files workspace to attach existing relationship files to ${contract.summary.draftPaymentsCount} draft payment request${contract.summary.draftPaymentsCount === 1 ? `` : `s`} without losing this contract context.`
                    : `You can open relationship files from this screen. When the next draft payment request is created, attach existing files from the contract files workspace instead of leaving the contract flow.`}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-blue-300/20 px-2 py-1 text-blue-100/80">
                    {draftLinkedFilesCount} file{draftLinkedFilesCount === 1 ? `` : `s`} already linked to draft work
                  </span>
                  {contract.summary.draftPaymentsCount > 0 ? (
                    <span className="rounded-full border border-(--app-border) px-2 py-1 text-blue-100/80">
                      {filesWithoutDraftLinkCount} file{filesWithoutDraftLinkCount === 1 ? `` : `s`} not yet linked to a
                      draft
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={buildContractFilesWorkspaceHref(contractId, returnToContractsHref)}
                    className="rounded-xl border border-blue-300/20 px-3 py-2 text-sm text-(--app-primary) transition hover:bg-(--app-primary-soft)"
                  >
                    Open contract files workspace
                  </Link>
                  {latestDraftPayment ? (
                    <Link
                      href={buildContractPaymentDetailHref(latestDraftPayment.id, contractId, returnToContractsHref)}
                      className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
                    >
                      Open latest draft
                    </Link>
                  ) : null}
                </div>
              </div>
              {contract.summary.documentsCount === 0 ? (
                <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
                  No files are attached to this contractor relationship yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {contract.documents.map((document) => (
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
                          <div className="mt-3 text-sm text-(--app-text-muted)">
                            Added {formatDateTime(document.createdAt)}
                          </div>
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
                        {contract.summary.draftPaymentsCount > 0 && !document.isAttachedToDraftPaymentRequest ? (
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
                            href={buildContractPaymentDetailHref(paymentRequestId, contractId, returnToContractsHref)}
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
                            href={buildContractPaymentDetailHref(paymentRequestId, contractId, returnToContractsHref)}
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
            aside={operatingPayment ? formatStatusLabel(operatingPayment.status) : `No activity`}
          >
            {activeWorkflow ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-3 text-sm text-(--app-primary)">
                  {activeWorkflow.title}
                </div>
                <div className="text-sm text-(--app-text-soft)">{activeWorkflow.detail}</div>
                <Link
                  href={activeWorkflow.primaryAction.href}
                  className="flex items-center gap-3 rounded-2xl border border-(--app-primary)/20 bg-(--app-primary-soft) px-4 py-3 text-sm text-(--app-primary) transition hover:opacity-90"
                >
                  <DocumentIcon className="h-5 w-5 text-(--app-primary)" />
                  {activeWorkflow.primaryAction.label}
                </Link>
                {operatingPayment ? (
                  <ContractInlineActionsClient
                    paymentRequestId={operatingPayment.id}
                    status={operatingPayment.status}
                    role={operatingPayment.role}
                    paymentRail={operatingPayment.paymentRail}
                    paymentDetailHref={buildContractPaymentDetailHref(
                      operatingPayment.id,
                      contractId,
                      returnToContractsHref,
                    )}
                    filesHref={buildContractFilesWorkspaceHref(contractId, returnToContractsHref)}
                    paymentFlowContext={buildContractPaymentFlowContext(contractId, returnToContractsHref)}
                  />
                ) : null}
                <div className="grid grid-cols-1 gap-3">
                  {activeWorkflowSecondaryActions.map((action) => (
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
            ) : null}
          </Panel>
        </div>
      </section>
    </div>
  );
}
