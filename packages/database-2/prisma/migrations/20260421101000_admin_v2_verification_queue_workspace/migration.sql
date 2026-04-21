ALTER TABLE "saved_view"
DROP CONSTRAINT "saved_view_workspace_check";

ALTER TABLE "saved_view"
ADD CONSTRAINT "saved_view_workspace_check"
  CHECK ("workspace" IN (
    'ledger_anomalies',
    'verification_queue'
  ));

ALTER TABLE "operational_alert"
DROP CONSTRAINT "operational_alert_workspace_check";

ALTER TABLE "operational_alert"
ADD CONSTRAINT "operational_alert_workspace_check"
  CHECK ("workspace" IN (
    'ledger_anomalies',
    'verification_queue'
  ));
