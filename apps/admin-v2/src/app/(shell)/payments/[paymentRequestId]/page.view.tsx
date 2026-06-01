import { ChargebackPaymentForm } from './forms/ChargebackPaymentForm';
import { RefundPaymentForm } from './forms/RefundPaymentForm';
import { type PaymentPageData } from './page.loader';
import { type PaymentPagePermissions } from './page.permissions';
import { PaymentAttachmentsAndLedgerSection } from './sections/PaymentAttachmentsAndLedgerSection';
import { PaymentContextRail } from './sections/PaymentContextRail';
import { PaymentHeaderPanel } from './sections/PaymentHeaderPanel';
import { PaymentSummarySection } from './sections/PaymentSummarySection';
import { PaymentTimelineAndAuditSection } from './sections/PaymentTimelineAndAuditSection';
import { AssignmentCard } from '../../../../components/assignment-card';
import { WorkspaceLayout } from '../../../../components/workspace-layout';
import {
  claimPaymentRequestAssignmentAction,
  reassignPaymentRequestAssignmentAction,
  releasePaymentRequestAssignmentAction,
} from '../../../../lib/admin-mutations/payments.server';

export function PaymentCasePageView({
  data,
  permissions,
}: {
  data: PaymentPageData;
  permissions: PaymentPagePermissions;
}) {
  const { paymentCase, reassignCandidates, backToQueueHref } = data;
  const { canReverse, canClaim, canRelease, canReassign } = permissions;

  return (
    <WorkspaceLayout
      workspace="payment-case"
      context={<PaymentContextRail paymentCase={paymentCase} backToQueueHref={backToQueueHref} />}
      contextTitle="Payment snapshot"
      contextDescription="Current status, linked investigations, and quick navigation for the payment request."
    >
      <>
        <PaymentHeaderPanel paymentCase={paymentCase} backToQueueHref={backToQueueHref} />
        <PaymentSummarySection paymentCase={paymentCase} permissions={permissions} />
        <AssignmentCard
          resourceId={paymentCase.id}
          assignment={paymentCase.assignment}
          reassignCandidates={reassignCandidates}
          capabilities={{ canClaim, canRelease, canReassign }}
          actions={{
            claim: claimPaymentRequestAssignmentAction,
            release: releasePaymentRequestAssignmentAction,
            reassign: reassignPaymentRequestAssignmentAction,
          }}
          copy={{ claimReasonPlaceholder: `Why are you claiming this payment request?` }}
        />
        <PaymentAttachmentsAndLedgerSection paymentCase={paymentCase} />
        <PaymentTimelineAndAuditSection paymentCase={paymentCase} />
        {canReverse ? (
          <section className="detailGrid">
            <RefundPaymentForm
              paymentCaseId={paymentCase.id}
              payerId={paymentCase.payer.id ?? null}
              requesterId={paymentCase.requester.id ?? null}
            />
            <ChargebackPaymentForm
              paymentCaseId={paymentCase.id}
              payerId={paymentCase.payer.id ?? null}
              requesterId={paymentCase.requester.id ?? null}
            />
          </section>
        ) : null}
      </>
    </WorkspaceLayout>
  );
}
