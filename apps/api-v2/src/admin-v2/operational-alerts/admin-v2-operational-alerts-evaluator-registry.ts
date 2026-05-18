import { type OperationalAlertWorkspaceEvaluator } from './admin-v2-operational-alerts-workspace-evaluators';
import { type OperationalAlertWorkspace } from './admin-v2-operational-alerts.dto';

export const ADMIN_V2_OPERATIONAL_ALERTS_EVALUATOR_REGISTRY = Symbol(`ADMIN_V2_OPERATIONAL_ALERTS_EVALUATOR_REGISTRY`);

export type OperationalAlertsEvaluatorRegistry = Readonly<
  Record<OperationalAlertWorkspace, OperationalAlertWorkspaceEvaluator>
>;
