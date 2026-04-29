import {
  buildPaymentDetailHref,
  buildPaymentEntryHref,
  type PaymentFlowContext,
} from '../payments/payment-flow-context';

type ContractWorkflowAction = {
  label: string;
  href: string;
};

type ContractWorkflowStatus = `draft` | `pending` | `waiting` | `completed` | `no_activity`;

type ResolvedContractWorkflow = {
  status: ContractWorkflowStatus;
  title: string;
  detail: string;
  primaryAction: ContractWorkflowAction;
  secondaryActions: ContractWorkflowAction[];
};

type ResolveContractWorkflowInput = {
  contractId: string;
  email: string | null | undefined;
  status: string | null | undefined;
  lastRequestId: string | null | undefined;
  returnToContractsHref?: string;
};

function normalizeContractWorkflowStatus(value: string | null | undefined): ContractWorkflowStatus {
  const normalized = value?.trim().toLowerCase();
  if (normalized === `draft` || normalized === `pending` || normalized === `waiting` || normalized === `completed`) {
    return normalized;
  }
  return `no_activity`;
}

export function buildContractDetailHref(contractId: string, returnToContractsHref?: string) {
  const baseHref = `/contracts/${contractId}`;
  if (!returnToContractsHref || returnToContractsHref === `/contracts`) {
    return baseHref;
  }
  const params = new URLSearchParams({ returnTo: returnToContractsHref });
  return `${baseHref}?${params.toString()}`;
}

export function buildContractPaymentFlowContext(
  contractId: string,
  returnToContractsHref?: string,
): PaymentFlowContext {
  return {
    contractId,
    returnTo: buildContractDetailHref(contractId, returnToContractsHref),
  };
}

function buildPaymentRequestHref(email: string | null | undefined, contractId: string, returnToContractsHref?: string) {
  return buildPaymentEntryHref(`/payments/new-request`, {
    email,
    ...buildContractPaymentFlowContext(contractId, returnToContractsHref),
  });
}

function buildStartPaymentHref(email: string | null | undefined, contractId: string, returnToContractsHref?: string) {
  return buildPaymentEntryHref(`/payments/start`, {
    email,
    ...buildContractPaymentFlowContext(contractId, returnToContractsHref),
  });
}

export function buildContractPaymentDetailHref(
  paymentRequestId: string,
  contractId: string,
  returnToContractsHref?: string,
) {
  return buildPaymentDetailHref(paymentRequestId, buildContractPaymentFlowContext(contractId, returnToContractsHref));
}

export function buildContractFilesWorkspaceHref(contractId: string, returnToContractsHref?: string) {
  const params = new URLSearchParams({
    contactId: contractId,
    returnTo: buildContractDetailHref(contractId, returnToContractsHref),
  });
  return `/documents?${params.toString()}`;
}

export function buildEditContactHref(contractId: string, returnToContractsHref?: string) {
  const params = new URLSearchParams({
    edit: contractId,
    returnTo: buildContractDetailHref(contractId, returnToContractsHref),
  });
  return `/contacts?${params.toString()}`;
}

export function resolveContractWorkflowActions({
  contractId,
  email,
  status,
  lastRequestId,
  returnToContractsHref,
}: ResolveContractWorkflowInput): ResolvedContractWorkflow {
  const normalizedStatus = normalizeContractWorkflowStatus(status);
  const requestPaymentAction = {
    label: `Request payment`,
    href: buildPaymentRequestHref(email, contractId, returnToContractsHref),
  };
  const startPaymentAction = {
    label: `Start payment`,
    href: buildStartPaymentHref(email, contractId, returnToContractsHref),
  };
  const paymentDetailHref = lastRequestId
    ? buildContractPaymentDetailHref(lastRequestId, contractId, returnToContractsHref)
    : null;

  if (normalizedStatus === `draft` && paymentDetailHref) {
    return {
      status: normalizedStatus,
      title: `Draft waiting for review`,
      detail: `An open draft still exists for this contractor relationship. Open it from here to review attachments, invoice state, and send timing.`,
      primaryAction: {
        label: `Open draft`,
        href: paymentDetailHref,
      },
      secondaryActions: [
        {
          label: `Request another payment`,
          href: requestPaymentAction.href,
        },
      ],
    };
  }

  if (normalizedStatus === `pending` && paymentDetailHref) {
    return {
      status: normalizedStatus,
      title: `Payment needs completion`,
      detail: `A payer-side pending payment is still open for this relationship. Keep the contract context while you move into the payment detail flow and complete the next step there.`,
      primaryAction: {
        label: `Open pending payment`,
        href: paymentDetailHref,
      },
      secondaryActions: [
        {
          label: `Start another payment`,
          href: startPaymentAction.href,
        },
      ],
    };
  }

  if (normalizedStatus === `waiting` && paymentDetailHref) {
    return {
      status: normalizedStatus,
      title: `Waiting for settlement outcome`,
      detail: `A payment is already in-flight for this relationship. Use the payment detail route for the current state, then return here for the broader relationship view.`,
      primaryAction: {
        label: `Open latest payment`,
        href: paymentDetailHref,
      },
      secondaryActions: [
        {
          label: `Request another payment`,
          href: requestPaymentAction.href,
        },
      ],
    };
  }

  if (normalizedStatus === `completed` && paymentDetailHref) {
    return {
      status: normalizedStatus,
      title: `Latest workflow is closed`,
      detail: `The most recent payment is no longer active. Start a new request or payment from this relationship when the next piece of work is ready.`,
      primaryAction: {
        label: `Open latest payment`,
        href: paymentDetailHref,
      },
      secondaryActions: [requestPaymentAction, startPaymentAction],
    };
  }

  return {
    status: `no_activity`,
    title: `No payment workflow yet`,
    detail: `This relationship has no payment history. Start from this contract to keep the next payment attached to the same operating context.`,
    primaryAction: requestPaymentAction,
    secondaryActions: [startPaymentAction],
  };
}
