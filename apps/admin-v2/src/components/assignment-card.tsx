import {
  type AdminRef,
  type AdminsListResponse,
  type AssignmentHistoryItem,
  type AssignmentSummary,
} from '../lib/admin-api.server';

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

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

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
    <section className="panel" aria-label="Assignment">
      <div className="pageHeader">
        <div>
          <h2>Assignment</h2>
          {currentAssignment ? (
            <>
              <p>
                Currently assigned to: <strong>{describeAdmin(currentAssignment.assignedTo)}</strong>
                {currentAssignment.assignedTo.email ? (
                  <span className="muted"> · {currentAssignment.assignedTo.email}</span>
                ) : null}
              </p>
              <p className="muted">Since: {formatDate(currentAssignment.assignedAt)}</p>
              {currentAssignment.reason ? (
                <p className="muted">Reason: &ldquo;{currentAssignment.reason}&rdquo;</p>
              ) : null}
              {currentAssignment.expiresAt ? (
                <p className="muted">Expires: {formatDate(currentAssignment.expiresAt)}</p>
              ) : null}
            </>
          ) : (
            <p className="muted">Unassigned</p>
          )}
        </div>
      </div>
      <div className="actionsRow">
        {!currentAssignment ? (
          <form action={actions.claim.bind(null, resourceId)} className="formStack">
            <label className="field">
              <span>Reason (optional)</span>
              <textarea name="reason" placeholder={claimPlaceholder} maxLength={500} />
            </label>
            <button className="primaryButton" type="submit" disabled={!capabilities.canClaim}>
              Claim
            </button>
          </form>
        ) : null}
        {currentAssignment ? (
          <form action={actions.release.bind(null, resourceId)} className="formStack">
            <input type="hidden" name="assignmentId" value={currentAssignment.id} />
            <label className="field">
              <span>Reason (optional)</span>
              <textarea name="reason" placeholder="Why are you releasing?" maxLength={500} />
            </label>
            <button className="secondaryButton" type="submit" disabled={!capabilities.canRelease}>
              Release
            </button>
          </form>
        ) : null}
        {capabilities.canReassign && currentAssignment ? (
          <form action={actions.reassign.bind(null, resourceId)} className="formStack">
            <input type="hidden" name="assignmentId" value={currentAssignment.id} />
            <input type="hidden" name="confirmed" value="false" />
            <label className="field">
              <span>New assignee</span>
              <select name="newAssigneeId" required defaultValue="">
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
            <label className="field">
              <span>Reason (required, min 10 chars)</span>
              <textarea name="reason" required minLength={10} maxLength={500} placeholder="Reason for reassignment" />
            </label>
            <label className="field">
              <span>Confirmation</span>
              <input type="checkbox" name="confirmed" value="true" required />
            </label>
            <button className="dangerButton" type="submit" name="confirmedSubmit" value="true">
              Reassign
            </button>
          </form>
        ) : null}
      </div>
      <details>
        <summary>Assignment history ({history.length})</summary>
        {history.length === 0 ? (
          <p className="muted">No previous assignments.</p>
        ) : (
          <ul className="formStack">
            {history.map((entry) => (
              <li className="panel" key={entry.id}>
                <p>
                  <strong>{describeAdmin(entry.assignedTo)}</strong>
                  <span className="muted"> · claimed {formatDate(entry.assignedAt)}</span>
                </p>
                {entry.releasedAt ? (
                  <p className="muted">
                    Released {formatDate(entry.releasedAt)} by {describeAdmin(entry.releasedBy)}
                  </p>
                ) : (
                  <p className="muted">Still active</p>
                )}
                {entry.reason ? <p className="muted">Reason: {entry.reason}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}
