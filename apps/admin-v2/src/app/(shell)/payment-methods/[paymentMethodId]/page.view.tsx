import { type PaymentMethodCasePageData } from './page.loader';
import { type PaymentMethodCasePagePermissions } from './page.permissions';
import { PaymentMethodActionsSection } from './sections/PaymentMethodActionsSection';
import { PaymentMethodAuditSection } from './sections/PaymentMethodAuditSection';
import { PaymentMethodContextRail } from './sections/PaymentMethodContextRail';
import { PaymentMethodHeaderPanel } from './sections/PaymentMethodHeaderPanel';
import { PaymentMethodSummaryGrid } from './sections/PaymentMethodSummaryGrid';
import { WorkspaceLayout } from '../../../../components/workspace-layout';

export function PaymentMethodCasePageView({
  data,
  permissions,
}: {
  data: PaymentMethodCasePageData;
  permissions: PaymentMethodCasePagePermissions;
}) {
  const { paymentMethod, backToQueueHref, fingerprintHref } = data;
  const { canManage } = permissions;

  return (
    <WorkspaceLayout
      workspace="payment-method-case"
      context={
        <PaymentMethodContextRail
          paymentMethod={paymentMethod}
          backToQueueHref={backToQueueHref}
          fingerprintHref={fingerprintHref}
        />
      }
      contextTitle="Method snapshot"
      contextDescription="Operational status, duplicate fingerprint posture, and shortcut links for the current method."
    >
      <>
        <PaymentMethodHeaderPanel
          paymentMethod={paymentMethod}
          backToQueueHref={backToQueueHref}
          fingerprintHref={fingerprintHref}
        />
        <PaymentMethodSummaryGrid paymentMethod={paymentMethod} />
        <PaymentMethodActionsSection paymentMethod={paymentMethod} canManage={canManage} />
        <PaymentMethodAuditSection paymentMethod={paymentMethod} />
      </>
    </WorkspaceLayout>
  );
}
