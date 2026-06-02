import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { type getAdmins } from '../../admin-api/admins.server';
import { type AssignmentWithCurrentAssignee, type ReassignCandidate } from '../reassign-candidates';

jest.mock(`../../admin-api/admins.server`, () => ({
  getAdmins: jest.fn(),
}));

const { getAdmins: mockedGetAdmins } = jest.requireMock(`../../admin-api/admins.server`) as {
  getAdmins: jest.MockedFunction<typeof getAdmins>;
};

async function loadSubject() {
  return (await import(`../reassign-candidates`)).loadReassignCandidates;
}

let loadReassignCandidates: Awaited<ReturnType<typeof loadSubject>>;

function buildAdmin(overrides: Partial<ReassignCandidate>): ReassignCandidate {
  return {
    id: `admin-1`,
    email: `admin-1@example.com`,
    type: `SUPER`,
    role: `ADMIN`,
    status: `ACTIVE`,
    lastActivityAt: null,
    createdAt: `2026-04-17T08:00:00.000Z`,
    updatedAt: `2026-04-17T08:00:00.000Z`,
    deletedAt: null,
    ...overrides,
  };
}

const assignedToAdmin1: AssignmentWithCurrentAssignee = {
  current: { assignedTo: { id: `admin-1` } },
};

const noAssignment: AssignmentWithCurrentAssignee = { current: null };

describe(`loadReassignCandidates`, () => {
  beforeAll(async () => {
    loadReassignCandidates = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdmins.mockReset();
  });

  it(`returns [] and does NOT call getAdmins when canReassign is false`, async () => {
    const result = await loadReassignCandidates({ canReassign: false, assignment: assignedToAdmin1 });

    expect(result).toEqual([]);
    expect(mockedGetAdmins).not.toHaveBeenCalled();
  });

  it(`calls getAdmins with { page: 1, pageSize: 50, status: 'ACTIVE' } and excludes the current assignee`, async () => {
    mockedGetAdmins.mockResolvedValueOnce({
      items: [
        buildAdmin({ id: `admin-1` }),
        buildAdmin({ id: `admin-2`, email: `admin-2@example.com` }),
        buildAdmin({ id: `admin-3`, email: `admin-3@example.com` }),
      ],
      pendingInvitations: [],
      total: 3,
      page: 1,
      pageSize: 50,
    });

    const result = await loadReassignCandidates({ canReassign: true, assignment: assignedToAdmin1 });

    expect(mockedGetAdmins).toHaveBeenCalledTimes(1);
    expect(mockedGetAdmins).toHaveBeenCalledWith({ page: 1, pageSize: 50, status: `ACTIVE` });
    expect(result.map((admin) => admin.id)).toEqual([`admin-2`, `admin-3`]);
  });

  it(`returns [] when canReassign is true and getAdmins returns null`, async () => {
    mockedGetAdmins.mockResolvedValueOnce(null);

    const result = await loadReassignCandidates({ canReassign: true, assignment: assignedToAdmin1 });

    expect(result).toEqual([]);
    expect(mockedGetAdmins).toHaveBeenCalledTimes(1);
  });

  it(`returns all admins when canReassign is true and assignment.current is null`, async () => {
    mockedGetAdmins.mockResolvedValueOnce({
      items: [buildAdmin({ id: `admin-1` }), buildAdmin({ id: `admin-2`, email: `admin-2@example.com` })],
      pendingInvitations: [],
      total: 2,
      page: 1,
      pageSize: 50,
    });

    const result = await loadReassignCandidates({ canReassign: true, assignment: noAssignment });

    expect(result.map((admin) => admin.id)).toEqual([`admin-1`, `admin-2`]);
  });
});
