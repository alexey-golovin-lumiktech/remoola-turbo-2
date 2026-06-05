import { ActionGhost } from '../../../../../components/action-ghost';
import { Panel } from '../../../../../components/panel';
import { mutedTextClass, nestedPanelClass, stackClass } from '../../../../../components/ui-classes';
import { EMPTY_VALUE, formatDateTime } from '../../../../../lib/admin-format';
import { type PayoutCasePageData } from '../page.loader';

export function PayoutOutcomesSection({ payoutCase }: { payoutCase: PayoutCasePageData[`payoutCase`] }) {
  return (
    <section className="detailGrid">
      <Panel title="Outcome timeline">
        <div className={stackClass}>
          {payoutCase.outcomes.length === 0 ? <p className={mutedTextClass}>No outcomes.</p> : null}
          {payoutCase.outcomes.map((outcome) => (
            <div className={nestedPanelClass} key={outcome.id}>
              <strong>{outcome.status}</strong>
              <p className={mutedTextClass}>Source: {outcome.source ?? EMPTY_VALUE}</p>
              <p className={mutedTextClass}>External id: {outcome.externalId ?? EMPTY_VALUE}</p>
              <p className={mutedTextClass}>{formatDateTime(outcome?.createdAt)}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Related ledger chain">
        <div className={stackClass}>
          {payoutCase.relatedEntries.map((entry) => (
            <div className={nestedPanelClass} key={entry.id}>
              <strong>{entry.type}</strong>
              <p className={mutedTextClass}>
                {entry.amount} {entry.currencyCode}
              </p>
              <p className={mutedTextClass}>Effective status: {entry.effectiveStatus}</p>
              <div className="actionsRow">
                <ActionGhost href={`/ledger/${entry.id}`}>Open entry</ActionGhost>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}
