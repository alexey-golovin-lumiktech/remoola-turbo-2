import { describe, expect, it } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import {
  assertCanReleaseAssignment,
  assertConfirmedReassign,
  assertExpectedReleasedAtNull,
  assertNotSelfReassign,
  assertSuperAdminReassign,
  assertTargetAdminForReassign,
  mapAdminRef,
  requireAssignmentId,
  requireAssignmentResourceType,
  requireNewAssigneeId,
  validateMandatoryAssignmentReason,
  validateOptionalAssignmentReason,
} from './admin-v2-assignment-policy';

const OPS_ADMIN_ID = `11111111-1111-4111-8111-111111111111`;
const OTHER_ADMIN_ID = `22222222-2222-4222-8222-222222222222`;
const SUPER_ADMIN_ID = `33333333-3333-4333-8333-333333333333`;

describe(`admin-v2 assignment pure policy`, () => {
  it(`maps nullable admin refs for assignment context`, () => {
    expect(mapAdminRef({ id: OPS_ADMIN_ID, email: `ops@example.com` })).toEqual({
      id: OPS_ADMIN_ID,
      name: null,
      email: `ops@example.com`,
    });
    expect(mapAdminRef({ id: null, email: `ops@example.com` })).toBeNull();
  });

  it(`validates optional and mandatory assignment reasons`, () => {
    expect(validateOptionalAssignmentReason(`  review queue  `)).toBe(`review queue`);
    expect(validateOptionalAssignmentReason(`   `)).toBeNull();
    expect(() => validateOptionalAssignmentReason(`x`.repeat(501))).toThrow(BadRequestException);

    expect(validateMandatoryAssignmentReason(`  Operator handoff due to OOO coverage  `)).toBe(
      `Operator handoff due to OOO coverage`,
    );
    expect(() => validateMandatoryAssignmentReason(`short`)).toThrow(BadRequestException);
  });

  it(`keeps release policy limited to owner or super-admin`, () => {
    expect(() =>
      assertCanReleaseAssignment({
        assignedTo: OPS_ADMIN_ID,
        adminId: OPS_ADMIN_ID,
        profile: { role: `OPS_ADMIN` },
      }),
    ).not.toThrow();
    expect(() =>
      assertCanReleaseAssignment({
        assignedTo: OTHER_ADMIN_ID,
        adminId: SUPER_ADMIN_ID,
        profile: { role: `SUPER_ADMIN` },
      }),
    ).not.toThrow();
    expect(() =>
      assertCanReleaseAssignment({
        assignedTo: OTHER_ADMIN_ID,
        adminId: OPS_ADMIN_ID,
        profile: { role: `OPS_ADMIN` },
      }),
    ).toThrow(ForbiddenException);
  });

  it(`validates expectedReleasedAtNull exactly as 0`, () => {
    expect(() => assertExpectedReleasedAtNull(0)).not.toThrow();
    expect(() => assertExpectedReleasedAtNull(1)).toThrow(BadRequestException);
  });

  it(`requires resourceType, assignmentId, and newAssigneeId as strings`, () => {
    expect(requireAssignmentResourceType(`verification`)).toBe(`verification`);
    expect(requireAssignmentId(`assignment-id`)).toBe(`assignment-id`);
    expect(requireNewAssigneeId(`admin-id`)).toBe(`admin-id`);

    expect(() => requireAssignmentResourceType(undefined)).toThrow(BadRequestException);
    expect(() => requireAssignmentId(undefined)).toThrow(BadRequestException);
    expect(() => requireNewAssigneeId(undefined)).toThrow(BadRequestException);
  });

  it(`requires explicit reassign confirmation`, () => {
    expect(() => assertConfirmedReassign(true)).not.toThrow();
    expect(() => assertConfirmedReassign(false)).toThrow(BadRequestException);
  });

  it(`limits reassign to super-admins`, () => {
    expect(() => assertSuperAdminReassign({ role: `SUPER_ADMIN` })).not.toThrow();
    expect(() => assertSuperAdminReassign({ role: `OPS_ADMIN` })).toThrow(ForbiddenException);
  });

  it(`rejects reassigning to self`, () => {
    expect(() => assertNotSelfReassign(OTHER_ADMIN_ID, OPS_ADMIN_ID)).not.toThrow();
    expect(() => assertNotSelfReassign(SUPER_ADMIN_ID, SUPER_ADMIN_ID)).toThrow(BadRequestException);
  });

  it(`rejects missing and deactivated target admins for reassign`, () => {
    expect(() => assertTargetAdminForReassign({ deletedAt: null })).not.toThrow();
    expect(() => assertTargetAdminForReassign(null)).toThrow(NotFoundException);
    expect(() => assertTargetAdminForReassign({ deletedAt: new Date() })).toThrow(BadRequestException);
  });
});
