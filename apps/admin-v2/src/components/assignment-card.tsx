import { ActionGhost } from './action-ghost';
import { ActionPrimary } from './action-primary';
import { Panel } from './panel';
import {
  checkboxFieldClass,
  checkboxInputClass,
  dangerButtonClass,
  detailsSummaryClass,
  fieldClass,
  fieldLabelClass,
  mutedTextClass,
  nestedPanelClass,
  stackClass,
  textAreaClass,
  textInputClass,
} from './ui-classes';
import {
  type AdminRef,
  type AdminsListResponse,
  type AssignmentHistoryItem,
  type AssignmentSummary,
} from '../lib/admin-api.server';
import { formatDateTime } from '../lib/admin-format';

type ReassignCandidate = AdminsListResponse[`items`][number];

export type AssignmentCardAction = (resourceId: string, formData: FormData) => Promise<void>;

export type AssignmentCardCopy = {
  claimReasonPlaceholder?: string;
};

export type AssignmentCardProps = {
  resourceId: string;
  assignment: {
    current: AssignmentSummary | null;
    history: AssignmentHistoryItem[];
  };
  reassignCandidates: ReassignCandidate[];
  capabilities: {
    canClaim: boolean;
    canRelease: boolean;
    canReassign: boolean;
  };
  actions: {
    claim: AssignmentCardAction;
    release: AssignmentCardAction;
    reassign: AssignmentCardAction;
  };
  copy?: AssignmentCardCopy;
};

function describeAdmin(ref: AdminRef | null | undefined): string {
  if (!ref) return `-`;
  return ref.name ?? ref.email ?? ref.id;
}

export function AssignmentCard({
  resourceId,
  assignment,
  reassignCandidates,
  capabilities,
  actions,
  copy,
}: AssignmentCardProps) {
  const currentAssignment = assignment.current;
  const history = assignment.history;
  const claimPlaceholder = copy?.claimReasonPlaceholder ?? `Why are you claiming this?`;

  return (
    <Panel
      eyebrow="Ownership"
      title="Assignment"
      description="Claim, release, and reassignment controls stay grouped here so they do not compete with case facts."
    >
      <div className={nestedPanelClass}>
        {currentAssignment ? (
          <div className={stackClass}>
            <p>
              Currently assigned to: <strong>{describeAdmin(currentAssignment.assignedTo)}</strong>
              {currentAssignment.assignedTo.email ? (
                <span className={mutedTextClass}> · {currentAssignment.assignedTo.email}</span>
              ) : null}
            </p>
            <p className={mutedTextClass}>Since: {formatDateTime(currentAssignment.assignedAt)}</p>
            {currentAssignment.reason ? (
              <p className={mutedTextClass}>Reason: &ldquo;{currentAssignment.reason}&rdquo;</p>
            ) : null}
            {currentAssignment.expiresAt ? (
              <p className={mutedTextClass}>Expires: {formatDateTime(currentAssignment.expiresAt)}</p>
            ) : null}
          </div>
        ) : (
          <p className={mutedTextClass}>Unassigned</p>
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {!currentAssignment ? (
          <form action={actions.claim.bind(null, resourceId)} className={nestedPanelClass}>
            <div className={stackClass}>
              <label className={fieldClass}>
                <span className={fieldLabelClass}>Reason (optional)</span>
                <textarea className={textAreaClass} name="reason" placeholder={claimPlaceholder} maxLength={500} />
              </label>
              <ActionPrimary type="submit" disabled={!capabilities.canClaim}>
                Claim
              </ActionPrimary>
            </div>
          </form>
        ) : null}
        {currentAssignment ? (
          <form action={actions.release.bind(null, resourceId)} className={nestedPanelClass}>
            <div className={stackClass}>
              <input type="hidden" name="assignmentId" value={currentAssignment.id} />
              <label className={fieldClass}>
                <span className={fieldLabelClass}>Reason (optional)</span>
                <textarea
                  className={textAreaClass}
                  name="reason"
                  placeholder="Why are you releasing?"
                  maxLength={500}
                />
              </label>
              <ActionGhost type="submit" disabled={!capabilities.canRelease}>
                Release
              </ActionGhost>
            </div>
          </form>
        ) : null}
        {capabilities.canReassign && currentAssignment ? (
          <form action={actions.reassign.bind(null, resourceId)} className={nestedPanelClass}>
            <div className={stackClass}>
              <input type="hidden" name="assignmentId" value={currentAssignment.id} />
              <input type="hidden" name="confirmed" value="false" />
              <label className={fieldClass}>
                <span className={fieldLabelClass}>New assignee</span>
                <select className={textInputClass} name="newAssigneeId" required defaultValue="">
                  <option value="" disabled>
                    Select an admin
                  </option>
                  {reassignCandidates.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className={fieldClass}>
                <span className={fieldLabelClass}>Reason (required, min 10 chars)</span>
                <textarea
                  className={textAreaClass}
                  name="reason"
                  required
                  minLength={10}
                  maxLength={500}
                  placeholder="Reason for reassignment"
                />
              </label>
              <label className={checkboxFieldClass}>
                <input className={checkboxInputClass} type="checkbox" name="confirmed" value="true" required />
                <span className={fieldLabelClass}>Confirmation</span>
              </label>
              <button className={dangerButtonClass} type="submit" name="confirmedSubmit" value="true">
                Reassign
              </button>
            </div>
          </form>
        ) : null}
      </div>
      <details className={nestedPanelClass}>
        <summary className={detailsSummaryClass}>Assignment history ({history.length})</summary>
        {history.length === 0 ? (
          <p className={mutedTextClass}>No previous assignments.</p>
        ) : (
          <ul className={stackClass}>
            {history.map((entry) => (
              <li className={nestedPanelClass} key={entry.id}>
                <p>
                  <strong>{describeAdmin(entry.assignedTo)}</strong>
                  <span className={mutedTextClass}> · claimed {formatDateTime(entry.assignedAt)}</span>
                </p>
                {entry.releasedAt ? (
                  <p className={mutedTextClass}>
                    Released {formatDateTime(entry.releasedAt)} by {describeAdmin(entry.releasedBy)}
                  </p>
                ) : (
                  <p className={mutedTextClass}>Still active</p>
                )}
                {entry.reason ? <p className={mutedTextClass}>Reason: {entry.reason}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </details>
    </Panel>
  );
}
