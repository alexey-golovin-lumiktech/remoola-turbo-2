import { ForceLogoutConsumerForm } from './forms/ForceLogoutConsumerForm';
import { type ConsumerPageData } from './page.loader';
import { type ConsumerPagePermissions } from './page.permissions';
import { ConsumerAuditSection } from './sections/ConsumerAuditSection';
import { ConsumerContextRail } from './sections/ConsumerContextRail';
import { ConsumerCountsGrid } from './sections/ConsumerCountsGrid';
import { ConsumerDetailsGrid } from './sections/ConsumerDetailsGrid';
import { ConsumerFlagsAndNotesSection } from './sections/ConsumerFlagsAndNotesSection';
import { ConsumerHeaderPanel } from './sections/ConsumerHeaderPanel';
import { ConsumerProfileGrid } from './sections/ConsumerProfileGrid';
import { ConsumerRelationshipsSection } from './sections/ConsumerRelationshipsSection';
import { ConsumerSummaryGrid } from './sections/ConsumerSummaryGrid';
import { ConsumerSupportActionsSection } from './sections/ConsumerSupportActionsSection';
import { WorkspaceLayout } from '../../../../components/workspace-layout';

export function ConsumerCasePageView({
  data,
  permissions,
}: {
  data: ConsumerPageData;
  permissions: ConsumerPagePermissions;
}) {
  const { consumer, contracts, ledgerSummary, authHistory, actionLog, backToQueueHref } = data;
  const ledgerRows = Object.entries(ledgerSummary?.summary ?? consumer.ledgerSummary ?? {});
  const totalPaymentRequests = consumer._count.asPayerPaymentRequests + consumer._count.asRequesterPaymentRequests;

  return (
    <WorkspaceLayout
      workspace="consumer-case"
      context={
        <ConsumerContextRail
          consumer={consumer}
          backToQueueHref={backToQueueHref}
          totalPaymentRequests={totalPaymentRequests}
        />
      }
      contextTitle="Consumer snapshot"
      contextDescription="Fast context, jump links, and summary counters for the current consumer case."
    >
      <>
        <ConsumerHeaderPanel consumer={consumer} backToQueueHref={backToQueueHref} />
        <ConsumerSummaryGrid consumer={consumer} permissions={permissions} />
        {permissions.canForceLogout ? <ForceLogoutConsumerForm consumerId={consumer.id} /> : null}
        <ConsumerCountsGrid consumer={consumer} totalPaymentRequests={totalPaymentRequests} />
        <ConsumerDetailsGrid consumer={consumer} />
        <ConsumerProfileGrid consumer={consumer} ledgerRows={ledgerRows} />
        <ConsumerSupportActionsSection consumerId={consumer.id} permissions={permissions} />
        <ConsumerFlagsAndNotesSection consumer={consumer} permissions={permissions} />
        <ConsumerRelationshipsSection consumer={consumer} contracts={contracts} />
        <ConsumerAuditSection consumer={consumer} authHistory={authHistory} actionLog={actionLog} />
      </>
    </WorkspaceLayout>
  );
}
