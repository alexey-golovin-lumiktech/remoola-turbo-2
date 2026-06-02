import { describe, expect, it } from '@jest/globals';

import { type AdminIdentity } from '../../admin-api/types';
import { deriveAssignmentPermissions, type AssignmentSurface } from '../assignment-permissions';

function buildIdentity(overrides: Partial<AdminIdentity> = {}): AdminIdentity {
  return {
    id: `admin-1`,
    email: `admin@example.com`,
    type: `SUPER`,
    role: `SUPER_ADMIN`,
    phase: `workspace`,
    capabilities: [`assignments.manage`],
    workspaces: [`documents`],
    ...overrides,
  };
}

const noAssignment: AssignmentSurface = { current: null };
const assignedToSelf: AssignmentSurface = { current: { assignedTo: { id: `admin-1` } } };
const assignedToOther: AssignmentSurface = { current: { assignedTo: { id: `admin-2` } } };

describe(`deriveAssignmentPermissions`, () => {
  it(`returns all-false / null currentAdminId when identity is null`, () => {
    expect(deriveAssignmentPermissions(null, assignedToSelf)).toEqual({
      currentAdminId: null,
      ownsAssignment: false,
      canManageAssignments: false,
      canClaim: false,
      canRelease: false,
      canReassign: false,
    });
  });

  it(`returns all-false / null currentAdminId when identity is undefined`, () => {
    expect(deriveAssignmentPermissions(undefined, noAssignment)).toEqual({
      currentAdminId: null,
      ownsAssignment: false,
      canManageAssignments: false,
      canClaim: false,
      canRelease: false,
      canReassign: false,
    });
  });

  it(`allows claim when identity has assignments.manage and no current assignment`, () => {
    const identity = buildIdentity({ role: `ADMIN`, capabilities: [`assignments.manage`] });
    const permissions = deriveAssignmentPermissions(identity, noAssignment);
    expect(permissions.canManageAssignments).toBe(true);
    expect(permissions.canClaim).toBe(true);
    expect(permissions.canRelease).toBe(false);
    expect(permissions.canReassign).toBe(false);
    expect(permissions.ownsAssignment).toBe(false);
  });

  it(`marks owner of current assignment with canRelease and ownsAssignment`, () => {
    const identity = buildIdentity({ id: `admin-1`, role: `ADMIN`, capabilities: [`assignments.manage`] });
    const permissions = deriveAssignmentPermissions(identity, assignedToSelf);
    expect(permissions.ownsAssignment).toBe(true);
    expect(permissions.canRelease).toBe(true);
    expect(permissions.canReassign).toBe(false);
    expect(permissions.canClaim).toBe(false);
  });

  it(`denies release to non-owner without SUPER_ADMIN even with assignments.manage`, () => {
    const identity = buildIdentity({ id: `admin-1`, role: `ADMIN`, capabilities: [`assignments.manage`] });
    const permissions = deriveAssignmentPermissions(identity, assignedToOther);
    expect(permissions.ownsAssignment).toBe(false);
    expect(permissions.canRelease).toBe(false);
    expect(permissions.canReassign).toBe(false);
    expect(permissions.canClaim).toBe(false);
  });

  it(`grants canRelease and canReassign to SUPER_ADMIN with current assignment`, () => {
    const identity = buildIdentity({ id: `admin-1`, role: `SUPER_ADMIN`, capabilities: [`assignments.manage`] });
    const permissions = deriveAssignmentPermissions(identity, assignedToOther);
    expect(permissions.canRelease).toBe(true);
    expect(permissions.canReassign).toBe(true);
    expect(permissions.ownsAssignment).toBe(false);
  });

  it(`denies canManageAssignments when capabilities array does not include 'assignments.manage'`, () => {
    const identity = buildIdentity({ capabilities: [`documents.read`] });
    const permissions = deriveAssignmentPermissions(identity, noAssignment);
    expect(permissions.canManageAssignments).toBe(false);
    expect(permissions.canClaim).toBe(false);
    expect(permissions.canRelease).toBe(false);
  });

  it(`treats missing capabilities array (untyped runtime case) as canManageAssignments=false`, () => {
    const identity = {
      id: `admin-1`,
      email: `x@y.z`,
      type: `SUPER`,
      role: `ADMIN`,
      phase: `p`,
      workspaces: [],
    } as unknown as AdminIdentity;
    const permissions = deriveAssignmentPermissions(identity, noAssignment);
    expect(permissions.canManageAssignments).toBe(false);
    expect(permissions.currentAdminId).toBe(`admin-1`);
  });

  it(`keeps canReassign false for SUPER_ADMIN when no current assignment`, () => {
    const identity = buildIdentity({ role: `SUPER_ADMIN`, capabilities: [`assignments.manage`] });
    const permissions = deriveAssignmentPermissions(identity, noAssignment);
    expect(permissions.canReassign).toBe(false);
    expect(permissions.canClaim).toBe(true);
  });
});
