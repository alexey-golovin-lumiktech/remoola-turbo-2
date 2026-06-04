import { Panel } from '../../../../../components/panel';
import { mutedTextClass } from '../../../../../components/ui-classes';
import { formatDate, EMPTY_VALUE } from '../../../../../lib/admin-format';
import { type VerificationCasePageData } from '../page.loader';

export function VerificationSummaryGrid({
  verificationCase,
}: {
  verificationCase: VerificationCasePageData[`verificationCase`];
}) {
  return (
    <section className="statsGrid">
      <Panel>
        <h3>Decision state</h3>
        <p className={mutedTextClass}>Version: {verificationCase.version}</p>
        <p className={mutedTextClass}>Reason: {verificationCase.verificationReason ?? EMPTY_VALUE}</p>
        <p className={mutedTextClass}>Verification updated: {formatDate(verificationCase.verificationUpdatedAt)}</p>
        <p className={mutedTextClass}>Stripe status: {verificationCase.stripeIdentityStatus ?? EMPTY_VALUE}</p>
      </Panel>
      <Panel>
        <h3>Auth risk</h3>
        <p className={mutedTextClass}>Login failures 24h: {verificationCase.authRisk.loginFailures24h}</p>
        <p className={mutedTextClass}>Refresh reuse 30d: {verificationCase.authRisk.refreshReuse30d}</p>
        <p className={mutedTextClass}>SLA computed: {formatDate(verificationCase.verificationSla.lastComputedAt)}</p>
      </Panel>
      <Panel>
        <h3>Profile and docs</h3>
        <p className={mutedTextClass}>Contacts: {verificationCase._count.contacts}</p>
        <p className={mutedTextClass}>Documents: {verificationCase._count.consumerResources}</p>
        <p className={mutedTextClass}>Payment methods: {verificationCase._count.paymentMethods}</p>
        <p className={mutedTextClass}>Recent payment requests: {verificationCase.recentPaymentRequests.length}</p>
      </Panel>
    </section>
  );
}
