import { ActionGhost } from '../../../../../components/action-ghost';
import { Panel } from '../../../../../components/panel';
import { type PaymentMethodCasePageData } from '../page.loader';
import { renderMethodLabel } from '../payment-method-shared';

export function PaymentMethodHeaderPanel({
  paymentMethod,
  backToQueueHref,
  fingerprintHref,
}: {
  paymentMethod: PaymentMethodCasePageData[`paymentMethod`];
  backToQueueHref: string;
  fingerprintHref: string | null;
}) {
  return (
    <Panel
      eyebrow="Payment method"
      title="Payment Method"
      description={renderMethodLabel(paymentMethod)}
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href={`/consumers/${paymentMethod.consumer.id}`}>Consumer case</ActionGhost>
          <ActionGhost href={`/payment-methods?consumerId=${paymentMethod.consumer.id}&includeDeleted=true`}>
            Consumer payment methods
          </ActionGhost>
          {fingerprintHref ? <ActionGhost href={fingerprintHref}>Fingerprint cohort</ActionGhost> : null}
        </div>
      }
      surface="primary"
    >
      <p className="muted mono">{paymentMethod.id}</p>
      <div className="pillRow">
        <span className="pill">{paymentMethod.type}</span>
        <span className="pill">{paymentMethod.status}</span>
        {paymentMethod.defaultSelected ? <span className="pill">Default selected</span> : null}
        {paymentMethod.stripeFingerprint ? <span className="pill">Fingerprint present</span> : null}
        {paymentMethod.duplicateEscalation ? <span className="pill">Duplicate escalated</span> : null}
        {paymentMethod.disabledAt ? <span className="pill">Disabled</span> : null}
        {paymentMethod.deletedAt ? <span className="pill">Soft-deleted method</span> : null}
      </div>
    </Panel>
  );
}
