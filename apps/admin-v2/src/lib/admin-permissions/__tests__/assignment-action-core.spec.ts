import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { type postAdminMutation } from '../../admin-mutations/core.server';
import {
  type buildAssignmentClaimBody,
  type buildAssignmentReassignBody,
  type buildAssignmentReleaseBody,
} from '../../admin-mutations/form-helpers';

jest.mock(`../../admin-mutations/core.server`, () => ({
  postAdminMutation: jest.fn(),
}));

jest.mock(`../../admin-mutations/form-helpers`, () => ({
  buildAssignmentClaimBody: jest.fn(),
  buildAssignmentReleaseBody: jest.fn(),
  buildAssignmentReassignBody: jest.fn(),
}));

const { postAdminMutation: mockedPostAdminMutation } = jest.requireMock(`../../admin-mutations/core.server`) as {
  postAdminMutation: jest.MockedFunction<typeof postAdminMutation>;
};

const {
  buildAssignmentClaimBody: mockedBuildClaim,
  buildAssignmentReleaseBody: mockedBuildRelease,
  buildAssignmentReassignBody: mockedBuildReassign,
} = jest.requireMock(`../../admin-mutations/form-helpers`) as {
  buildAssignmentClaimBody: jest.MockedFunction<typeof buildAssignmentClaimBody>;
  buildAssignmentReleaseBody: jest.MockedFunction<typeof buildAssignmentReleaseBody>;
  buildAssignmentReassignBody: jest.MockedFunction<typeof buildAssignmentReassignBody>;
};

async function loadSubject() {
  return import(`../assignment-action-core`);
}

let runAssignmentClaim: Awaited<ReturnType<typeof loadSubject>>[`runAssignmentClaim`];
let runAssignmentRelease: Awaited<ReturnType<typeof loadSubject>>[`runAssignmentRelease`];
let runAssignmentReassign: Awaited<ReturnType<typeof loadSubject>>[`runAssignmentReassign`];

describe(`assignment-action-core`, () => {
  beforeAll(async () => {
    const mod = await loadSubject();
    runAssignmentClaim = mod.runAssignmentClaim;
    runAssignmentRelease = mod.runAssignmentRelease;
    runAssignmentReassign = mod.runAssignmentReassign;
  });

  beforeEach(() => {
    mockedPostAdminMutation.mockReset();
    mockedPostAdminMutation.mockResolvedValue(undefined as never);
    mockedBuildClaim.mockReset();
    mockedBuildRelease.mockReset();
    mockedBuildReassign.mockReset();
    mockedBuildClaim.mockReturnValue({ kind: `claim-body` } as never);
    mockedBuildRelease.mockReturnValue({ kind: `release-body` } as never);
    mockedBuildReassign.mockReturnValue({ kind: `reassign-body` } as never);
  });

  describe(`runAssignmentClaim`, () => {
    it(`calls buildAssignmentClaimBody with (resourceType, resourceId, formData) and posts the result to /admin-v2/assignments/claim`, async () => {
      const revalidate = jest.fn();
      const formData = new FormData();

      await runAssignmentClaim({
        resourceType: `document`,
        resourceId: `doc-1`,
        idLabel: `documentId`,
        errorMessage: `Failed to claim document assignment`,
        formData,
        revalidate,
      });

      expect(mockedBuildClaim).toHaveBeenCalledTimes(1);
      expect(mockedBuildClaim).toHaveBeenCalledWith(`document`, `doc-1`, formData);

      expect(mockedPostAdminMutation).toHaveBeenCalledTimes(1);
      expect(mockedPostAdminMutation).toHaveBeenCalledWith(
        `/admin-v2/assignments/claim`,
        { kind: `claim-body` },
        `Failed to claim document assignment`,
      );

      expect(revalidate).toHaveBeenCalledTimes(1);
    });

    it(`throws "<idLabel> is required" when resourceId is empty and skips downstream calls`, async () => {
      const revalidate = jest.fn();

      await expect(
        runAssignmentClaim({
          resourceType: `document`,
          resourceId: ``,
          idLabel: `documentId`,
          errorMessage: `Failed to claim document assignment`,
          formData: new FormData(),
          revalidate,
        }),
      ).rejects.toThrow(`documentId is required`);

      expect(mockedBuildClaim).not.toHaveBeenCalled();
      expect(mockedPostAdminMutation).not.toHaveBeenCalled();
      expect(revalidate).not.toHaveBeenCalled();
    });

    it(`does not invoke revalidate when postAdminMutation throws`, async () => {
      const revalidate = jest.fn();
      mockedPostAdminMutation.mockRejectedValueOnce(new Error(`network down`));

      await expect(
        runAssignmentClaim({
          resourceType: `payout`,
          resourceId: `payout-1`,
          idLabel: `payoutId`,
          errorMessage: `Failed to claim payout assignment`,
          formData: new FormData(),
          revalidate,
        }),
      ).rejects.toThrow(`network down`);

      expect(mockedPostAdminMutation).toHaveBeenCalledTimes(1);
      expect(revalidate).not.toHaveBeenCalled();
    });
  });

  describe(`runAssignmentRelease`, () => {
    it(`calls buildAssignmentReleaseBody with formData and posts the result to /admin-v2/assignments/release`, async () => {
      const revalidate = jest.fn();
      const formData = new FormData();

      await runAssignmentRelease({
        resourceId: `ledger-1`,
        idLabel: `ledgerEntryId`,
        errorMessage: `Failed to release ledger entry assignment`,
        formData,
        revalidate,
      });

      expect(mockedBuildRelease).toHaveBeenCalledTimes(1);
      expect(mockedBuildRelease).toHaveBeenCalledWith(formData);

      expect(mockedPostAdminMutation).toHaveBeenCalledTimes(1);
      expect(mockedPostAdminMutation).toHaveBeenCalledWith(
        `/admin-v2/assignments/release`,
        { kind: `release-body` },
        `Failed to release ledger entry assignment`,
      );

      expect(revalidate).toHaveBeenCalledTimes(1);
    });

    it(`throws "<idLabel> is required" when resourceId is empty and skips downstream calls`, async () => {
      const revalidate = jest.fn();

      await expect(
        runAssignmentRelease({
          resourceId: ``,
          idLabel: `ledgerEntryId`,
          errorMessage: `Failed to release ledger entry assignment`,
          formData: new FormData(),
          revalidate,
        }),
      ).rejects.toThrow(`ledgerEntryId is required`);

      expect(mockedBuildRelease).not.toHaveBeenCalled();
      expect(mockedPostAdminMutation).not.toHaveBeenCalled();
      expect(revalidate).not.toHaveBeenCalled();
    });
  });

  describe(`runAssignmentReassign`, () => {
    it(`calls buildAssignmentReassignBody with formData and posts the result to /admin-v2/assignments/reassign`, async () => {
      const revalidate = jest.fn();
      const formData = new FormData();

      await runAssignmentReassign({
        resourceId: `conv-1`,
        idLabel: `conversionId`,
        errorMessage: `Failed to reassign scheduled FX conversion assignment`,
        formData,
        revalidate,
      });

      expect(mockedBuildReassign).toHaveBeenCalledTimes(1);
      expect(mockedBuildReassign).toHaveBeenCalledWith(formData);

      expect(mockedPostAdminMutation).toHaveBeenCalledTimes(1);
      expect(mockedPostAdminMutation).toHaveBeenCalledWith(
        `/admin-v2/assignments/reassign`,
        { kind: `reassign-body` },
        `Failed to reassign scheduled FX conversion assignment`,
      );

      expect(revalidate).toHaveBeenCalledTimes(1);
    });

    it(`throws "<idLabel> is required" when resourceId is empty and skips downstream calls`, async () => {
      const revalidate = jest.fn();

      await expect(
        runAssignmentReassign({
          resourceId: ``,
          idLabel: `conversionId`,
          errorMessage: `Failed to reassign scheduled FX conversion assignment`,
          formData: new FormData(),
          revalidate,
        }),
      ).rejects.toThrow(`conversionId is required`);

      expect(mockedBuildReassign).not.toHaveBeenCalled();
      expect(mockedPostAdminMutation).not.toHaveBeenCalled();
      expect(revalidate).not.toHaveBeenCalled();
    });
  });
});
