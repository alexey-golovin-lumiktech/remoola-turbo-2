import { getAdmins } from '../admin-api/admins.server';
import { type AdminsListResponse } from '../admin-api/types';

export type AssignmentWithCurrentAssignee = {
  current: { assignedTo: { id: string } } | null;
};

export type ReassignCandidate = AdminsListResponse[`items`][number];

export async function loadReassignCandidates(options: {
  canReassign: boolean;
  assignment: AssignmentWithCurrentAssignee;
}): Promise<ReassignCandidate[]> {
  if (!options.canReassign) {
    return [];
  }

  const adminsResponse = await getAdmins({ page: 1, pageSize: 50, status: `ACTIVE` });
  return (adminsResponse?.items ?? []).filter((admin) => admin.id !== options.assignment.current?.assignedTo.id);
}
