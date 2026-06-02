import { ActionGhost } from '../../../../../components/action-ghost';
import { ContextStat } from '../../../../../components/context-stat';
import { type PaymentMethodCasePageData } from '../page.loader';

export function PaymentMethodContextRail({
  paymentMethod,
  backToQueueHref,
  fingerprintHref,
}: {
  paymentMethod: PaymentMethodCasePageData[`paymentMethod`];
  backToQueueHref: string;
  fingerprintHref: string | null;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ContextStat
          label="Status"
          value={paymentMethod.status}
          tone={paymentMethod.status === `DISABLED` ? `rose` : `cyan`}
        />
        <ContextStat label="Default selected" value={paymentMethod.defaultSelected ? `Yes` : `No`} />
        <ContextStat
          label="Fingerprint duplicates"
          value={paymentMethod.fingerprintDuplicates.length}
          tone={paymentMethod.fingerprintDuplicates.length > 0 ? `amber` : `neutral`}
        />
        <ContextStat
          label="Deleted"
          value={paymentMethod.deletedAt ? `Yes` : `No`}
          tone={paymentMethod.deletedAt ? `rose` : `neutral`}
        />
      </div>
      <div className="contextRailSection">
        <h4>Quick links</h4>
        <div className="contextRailLinks">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href={`/consumers/${paymentMethod.consumer.id}`}>Consumer case</ActionGhost>
          <ActionGhost href={`/payment-methods?consumerId=${paymentMethod.consumer.id}&includeDeleted=true`}>
            Consumer methods
          </ActionGhost>
          {fingerprintHref ? <ActionGhost href={fingerprintHref}>Fingerprint cohort</ActionGhost> : null}
        </div>
      </div>
    </>
  );
}
