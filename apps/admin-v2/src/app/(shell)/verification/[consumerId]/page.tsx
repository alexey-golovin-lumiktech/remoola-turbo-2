import { notFound } from 'next/navigation';

import { ActionGhost } from '../../../../components/action-ghost';
import { ActionPrimary } from '../../../../components/action-primary';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';
import { AssignmentCard } from '../../../../components/assignment-card';
import { Panel } from '../../../../components/panel';
import { TinyPill } from '../../../../components/tiny-pill';
import {
  checkboxFieldClass,
  checkboxInputClass,
  dangerButtonClass,
  fieldClass,
  fieldLabelClass,
  monoMutedTextClass,
  mutedTextClass,
  panelClass,
  stackClass,
  textAreaClass,
} from '../../../../components/ui-classes';
import { getAdminIdentity, getAdmins, getVerificationCaseResult } from '../../../../lib/admin-api.server';
import {
  approveVerificationAction,
  claimVerificationAssignmentAction,
  flagVerificationAction,
  forceLogoutConsumerAction,
  reassignVerificationAssignmentAction,
  rejectVerificationAction,
  releaseVerificationAssignmentAction,
  requestInfoVerificationAction,
} from '../../../../lib/admin-mutations.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

export default async function VerificationCasePage({ params }: { params: Promise<{ consumerId: string }> }) {
  const { consumerId } = await params;
  const [verificationCaseResult, identity] = await Promise.all([
    getVerificationCaseResult(consumerId),
    getAdminIdentity(),
  ]);

  if (verificationCaseResult.status === `not_found`) {
    notFound();
  }
  if (verificationCaseResult.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Verification case unavailable"
        description="Your admin identity can sign in, but it cannot access this verification surface."
      />
    );
  }
  if (verificationCaseResult.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Verification case unavailable"
        description="The verification case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }
  const verificationCase = verificationCaseResult.data;

  const controls = verificationCase.decisionControls;
  const currentAssignment = verificationCase.assignment.current;
  const currentAdminId = identity?.id ?? null;
  const ownsAssignment = Boolean(
    currentAssignment && currentAdminId && currentAssignment.assignedTo.id === currentAdminId,
  );
  const canClaim = controls.canManageAssignments && !currentAssignment;
  const canRelease = Boolean(
    currentAssignment && controls.canManageAssignments && (ownsAssignment || controls.canReassignAssignments),
  );
  const canReassign = Boolean(currentAssignment && controls.canReassignAssignments);
  const reassignCandidatesResponse = canReassign ? await getAdmins({ page: 1, pageSize: 50, status: `ACTIVE` }) : null;
  const reassignCandidates = (reassignCandidatesResponse?.items ?? []).filter(
    (admin) => admin.id !== currentAssignment?.assignedTo.id,
  );

  return (
    <>
      <Panel
        title="Verification Case"
        description={verificationCase.email}
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionGhost href={`/consumers/${verificationCase.id}`}>Open consumer case</ActionGhost>
            <ActionGhost href={`/audit/admin-actions?resourceId=${verificationCase.id}`}>
              Related admin actions
            </ActionGhost>
          </div>
        }
      >
        <p className={monoMutedTextClass}>{verificationCase.id}</p>
        <div className="pillRow">
          <TinyPill>{verificationCase.verificationStatus}</TinyPill>
          <TinyPill>{verificationCase.accountType}</TinyPill>
          {verificationCase.contractorKind ? <TinyPill>{verificationCase.contractorKind}</TinyPill> : null}
          {verificationCase.verificationSla.breached ? <TinyPill>SLA breached</TinyPill> : null}
        </div>
      </Panel>

      <section className="statsGrid">
        <Panel>
          <h3>Decision state</h3>
          <p className={mutedTextClass}>Version: {verificationCase.version}</p>
          <p className={mutedTextClass}>Reason: {verificationCase.verificationReason ?? `-`}</p>
          <p className={mutedTextClass}>Verification updated: {formatDate(verificationCase.verificationUpdatedAt)}</p>
          <p className={mutedTextClass}>Stripe status: {verificationCase.stripeIdentityStatus ?? `-`}</p>
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

      <AssignmentCard
        resourceId={verificationCase.id}
        assignment={verificationCase.assignment}
        reassignCandidates={reassignCandidates}
        capabilities={{ canClaim, canRelease, canReassign }}
        actions={{
          claim: claimVerificationAssignmentAction,
          release: releaseVerificationAssignmentAction,
          reassign: reassignVerificationAssignmentAction,
        }}
        copy={{ claimReasonPlaceholder: `Why are you claiming this case?` }}
      />

      {verificationCase.decisionControls.canDecide || verificationCase.decisionControls.canForceLogout ? (
        <section className="detailGrid">
          {verificationCase.decisionControls.canDecide ? (
            <>
              <Panel title="Approve">
                <form action={approveVerificationAction.bind(null, verificationCase.id)} className={stackClass}>
                  <input type="hidden" name="version" value={String(verificationCase.version)} />
                  <input type="hidden" name="confirmed" value="false" />
                  <label className={fieldClass}>
                    <span className={fieldLabelClass}>Reason (optional)</span>
                    <textarea className={textAreaClass} name="reason" placeholder="Optional approval note" />
                  </label>
                  <label className={checkboxFieldClass}>
                    <input className={checkboxInputClass} type="checkbox" name="confirmed" value="true" required />
                    <span className={fieldLabelClass}>Confirmation</span>
                  </label>
                  <ActionPrimary type="submit">Approve verification</ActionPrimary>
                </form>
              </Panel>
              <Panel title="Request Info">
                <form action={requestInfoVerificationAction.bind(null, verificationCase.id)} className={stackClass}>
                  <input type="hidden" name="version" value={String(verificationCase.version)} />
                  <input type="hidden" name="confirmed" value="false" />
                  <label className={fieldClass}>
                    <span className={fieldLabelClass}>Reason (optional)</span>
                    <textarea
                      className={textAreaClass}
                      name="reason"
                      placeholder="What the operator needs from the consumer"
                    />
                  </label>
                  <label className={checkboxFieldClass}>
                    <input className={checkboxInputClass} type="checkbox" name="confirmed" value="true" required />
                    <span className={fieldLabelClass}>Confirmation</span>
                  </label>
                  <ActionGhost type="submit">Request more info</ActionGhost>
                </form>
              </Panel>
              <Panel title="Flag">
                <form action={flagVerificationAction.bind(null, verificationCase.id)} className={stackClass}>
                  <input type="hidden" name="version" value={String(verificationCase.version)} />
                  <input type="hidden" name="confirmed" value="false" />
                  <label className={fieldClass}>
                    <span className={fieldLabelClass}>Reason (optional)</span>
                    <textarea className={textAreaClass} name="reason" placeholder="Optional flag note" />
                  </label>
                  <label className={checkboxFieldClass}>
                    <input className={checkboxInputClass} type="checkbox" name="confirmed" value="true" required />
                    <span className={fieldLabelClass}>Confirmation</span>
                  </label>
                  <ActionGhost type="submit">Flag verification</ActionGhost>
                </form>
              </Panel>
              <Panel title="Reject">
                <form action={rejectVerificationAction.bind(null, verificationCase.id)} className={stackClass}>
                  <input type="hidden" name="version" value={String(verificationCase.version)} />
                  <input type="hidden" name="confirmed" value="false" />
                  <label className={fieldClass}>
                    <span className={fieldLabelClass}>Reason</span>
                    <textarea
                      className={textAreaClass}
                      name="reason"
                      required
                      placeholder="Reject reason is required"
                    />
                  </label>
                  <label className={checkboxFieldClass}>
                    <input className={checkboxInputClass} type="checkbox" name="confirmed" value="true" required />
                    <span className={fieldLabelClass}>Confirmation</span>
                  </label>
                  <button className={dangerButtonClass} type="submit" name="confirmedSubmit" value="true">
                    Reject verification
                  </button>
                </form>
              </Panel>
            </>
          ) : null}

          {verificationCase.decisionControls.canForceLogout ? (
            <Panel title="Force Logout">
              <form action={forceLogoutConsumerAction.bind(null, verificationCase.id)} className={stackClass}>
                <input type="hidden" name="confirmed" value="false" />
                <label className={checkboxFieldClass}>
                  <input className={checkboxInputClass} type="checkbox" name="confirmed" value="true" required />
                  <span className={fieldLabelClass}>Confirmation</span>
                </label>
                <button className={dangerButtonClass} type="submit" name="confirmedSubmit" value="true">
                  Revoke all consumer sessions
                </button>
              </form>
            </Panel>
          ) : null}
        </section>
      ) : null}

      <section className="detailGrid">
        <Panel title="Decision history">
          {verificationCase.decisionHistory.length === 0 ? (
            <p className={mutedTextClass}>No verification decisions yet.</p>
          ) : null}
          <div className={stackClass}>
            {verificationCase.decisionHistory.map((item, index) => (
              <div className={panelClass} key={String(item.id ?? index)}>
                <strong>{String(item.action ?? `-`)}</strong>
                <p className={mutedTextClass}>
                  Admin: {String((item as { admin?: { email?: string } }).admin?.email ?? item.adminId ?? `-`)}
                </p>
                <p className={mutedTextClass}>
                  Created: {formatDate(typeof item.createdAt === `string` ? item.createdAt : null)}
                </p>
                <pre className="mono">{JSON.stringify(item.metadata ?? {}, null, 2)}</pre>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Recent auth events">
          {verificationCase.authRisk.recentEvents.length === 0 ? (
            <p className={mutedTextClass}>No recent auth events.</p>
          ) : null}
          <div className={stackClass}>
            {verificationCase.authRisk.recentEvents.map((item, index) => (
              <div className={panelClass} key={String(item.id ?? index)}>
                <strong>{String(item.event ?? `-`)}</strong>
                <p className={mutedTextClass}>
                  Created: {formatDate(typeof item.createdAt === `string` ? item.createdAt : null)}
                </p>
                <p className={mutedTextClass}>IP: {String(item.ipAddress ?? `-`)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </>
  );
}
