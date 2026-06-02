import {
  buildContractFilesWorkspaceHref,
  buildContractPaymentDetailHref,
  buildEditContactHref,
  resolveContractWorkflowActions,
} from './contract-workflow-actions';
import { type ContractDetailsResponse } from '../../../lib/consumer-api.server';

type RelationshipTimelineItem = {
  id: string;
  createdAt: string;
  createdAtLabel: string;
  title: string;
  detail: string;
  href?: string;
  statusLabel?: string;
};

type ContractDetailPaymentItem = ContractDetailsResponse[`payments`][number] & {
  createdAtLabel: string;
  statusLabel: string;
  href: string;
};

type ContractDetailDocumentItem = ContractDetailsResponse[`documents`][number] & {
  createdAtLabel: string;
};

export type ContractDetailViewModel = {
  activeWorkflow: ReturnType<typeof resolveContractWorkflowActions>;
  activeWorkflowSecondaryActions: Array<{ label: string; href: string }>;
  addressLabel: string;
  contractId: string;
  contractTitle: string;
  draftLinkedFilesCount: number;
  emailLabel: string;
  filesWithoutDraftLinkCount: number;
  initials: string;
  latestDraftPaymentId: string | null;
  latestPaymentLabel: string;
  operatingPayment: ContractDetailsResponse[`payments`][number] | null;
  paymentItems: ContractDetailPaymentItem[];
  readiness: {
    label: string;
    description: string;
  };
  relationshipSummaryLabel: string;
  summaryStatusLabel: string;
  timeline: RelationshipTimelineItem[];
  timelineCount: number;
  documents: ContractDetailDocumentItem[];
  contract: ContractDetailsResponse;
};

const OPERATING_PAYMENT_STATUS_PRIORITY = [`draft`, `pending`, `waiting`] as const;

function formatContractDateTime(value: string | null | undefined) {
  if (!value) return `—`;
  return new Date(value).toLocaleString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
    hour: `2-digit`,
    minute: `2-digit`,
  });
}

function formatContractDateOnly(value: string | null | undefined) {
  if (!value) return `—`;
  return new Date(value).toLocaleDateString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
  });
}

function formatContractStatusLabel(status: string | null | undefined) {
  if (!status) return `No activity`;
  return status
    .toLowerCase()
    .split(`_`)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(` `);
}

function formatContractAddress(contract: ContractDetailsResponse | null) {
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

function getContractInitials(contract: ContractDetailsResponse | null, contractId: string) {
  const seed = contract?.name?.trim() || contract?.email?.trim() || contractId.slice(0, 2);
  const parts = seed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ``}${parts[parts.length - 1]?.[0] ?? ``}`.toUpperCase();
  }
  return seed.slice(0, 2).toUpperCase();
}

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
      createdAtLabel: formatContractDateTime(contract.updatedAt),
      title: `Contact profile updated`,
      detail: `Saved contractor details were updated for this relationship.`,
      href: buildEditContactHref(contractId, returnToContractsHref),
    },
  ];

  for (const payment of contract.payments) {
    const paymentStatusLabel = formatContractStatusLabel(payment.status);
    const paymentHref = buildContractPaymentDetailHref(payment.id, contractId, returnToContractsHref);

    items.push({
      id: `payment-created-${payment.id}`,
      createdAt: payment.createdAt,
      createdAtLabel: formatContractDateTime(payment.createdAt),
      title: `Payment request created`,
      detail: `${payment.amount} · ${paymentStatusLabel}`,
      href: paymentHref,
      statusLabel: paymentStatusLabel,
    });

    if (payment.updatedAt !== payment.createdAt) {
      items.push({
        id: `payment-status-${payment.id}`,
        createdAt: payment.updatedAt,
        createdAtLabel: formatContractDateTime(payment.updatedAt),
        title: `Payment status updated`,
        detail: `Current state: ${paymentStatusLabel}`,
        href: paymentHref,
        statusLabel: paymentStatusLabel,
      });
    }
  }

  for (const document of contract.documents) {
    items.push({
      id: `document-added-${document.id}`,
      createdAt: document.createdAt,
      createdAtLabel: formatContractDateTime(document.createdAt),
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

export function buildContractDetailViewModel(
  contract: ContractDetailsResponse,
  contractId: string,
  returnToContractsHref: string,
): ContractDetailViewModel {
  const paymentItems = [...contract.payments]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .map((payment) => ({
      ...payment,
      createdAtLabel: formatContractDateOnly(payment.createdAt),
      statusLabel: formatContractStatusLabel(payment.status),
      href: buildContractPaymentDetailHref(payment.id, contractId, returnToContractsHref),
    }));
  const timeline = buildRelationshipTimeline(contract, contractId, returnToContractsHref);
  const latestPayment = getLatestPayment(paymentItems);
  const operatingPayment = getOperatingPayment(paymentItems);
  const latestDraftPayment = paymentItems.find((payment) => payment.status.trim().toUpperCase() === `DRAFT`) ?? null;
  const summaryStatusLabel = formatContractStatusLabel(operatingPayment?.status ?? contract.summary.lastStatus);
  const activeWorkflow = resolveContractWorkflowActions({
    contractId,
    email: contract.email,
    status: operatingPayment?.status ?? contract.summary.lastStatus,
    lastRequestId: operatingPayment?.id ?? contract.summary.lastRequestId,
    returnToContractsHref,
  });
  const activeWorkflowSecondaryActions = [
    ...activeWorkflow.secondaryActions,
    { label: `Open contract files`, href: buildContractFilesWorkspaceHref(contractId, returnToContractsHref) },
    { label: `Edit saved contact`, href: buildEditContactHref(contractId, returnToContractsHref) },
  ];
  const draftLinkedFilesCount = contract.documents.filter(
    (document) => document.isAttachedToDraftPaymentRequest,
  ).length;
  const filesWithoutDraftLinkCount =
    contract.summary.draftPaymentsCount > 0
      ? contract.documents.filter((document) => !document.isAttachedToDraftPaymentRequest).length
      : 0;

  return {
    activeWorkflow,
    activeWorkflowSecondaryActions,
    addressLabel: formatContractAddress(contract),
    contract,
    contractId,
    contractTitle: getContractTitle(contract, contractId),
    documents: contract.documents.map((document) => ({
      ...document,
      createdAtLabel: formatContractDateTime(document.createdAt),
    })),
    draftLinkedFilesCount,
    emailLabel: contract.email?.trim() || `No email available`,
    filesWithoutDraftLinkCount,
    initials: getContractInitials(contract, contractId),
    latestDraftPaymentId: latestDraftPayment?.id ?? null,
    latestPaymentLabel: latestPayment ? formatContractDateTime(latestPayment.updatedAt) : `—`,
    operatingPayment,
    paymentItems,
    readiness: describeOperationalReadiness(
      operatingPayment?.status ?? contract.summary.lastStatus,
      contract.summary.paymentsCount,
    ),
    relationshipSummaryLabel: contract.summary.lastActivity
      ? `Latest relationship activity ${formatContractDateTime(contract.summary.lastActivity)}`
      : `No payment activity yet`,
    summaryStatusLabel,
    timeline,
    timelineCount: timeline.length,
  };
}
