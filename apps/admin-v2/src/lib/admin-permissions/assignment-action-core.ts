import { postAdminMutation } from '../admin-mutations/core.server';
import {
  buildAssignmentClaimBody,
  buildAssignmentReassignBody,
  buildAssignmentReleaseBody,
} from '../admin-mutations/form-helpers';

type AssignmentClaimParams = {
  resourceType: string;
  resourceId: string;
  idLabel: string;
  errorMessage: string;
  formData: FormData;
  revalidate: () => void;
};

type AssignmentVerbParams = {
  resourceId: string;
  idLabel: string;
  errorMessage: string;
  formData: FormData;
  revalidate: () => void;
};

export async function runAssignmentClaim(params: AssignmentClaimParams): Promise<void> {
  if (!params.resourceId) {
    throw new Error(`${params.idLabel} is required`);
  }
  const body = buildAssignmentClaimBody(params.resourceType, params.resourceId, params.formData);
  await postAdminMutation(`/admin-v2/assignments/claim`, body, params.errorMessage);
  params.revalidate();
}

export async function runAssignmentRelease(params: AssignmentVerbParams): Promise<void> {
  if (!params.resourceId) {
    throw new Error(`${params.idLabel} is required`);
  }
  const body = buildAssignmentReleaseBody(params.formData);
  await postAdminMutation(`/admin-v2/assignments/release`, body, params.errorMessage);
  params.revalidate();
}

export async function runAssignmentReassign(params: AssignmentVerbParams): Promise<void> {
  if (!params.resourceId) {
    throw new Error(`${params.idLabel} is required`);
  }
  const body = buildAssignmentReassignBody(params.formData);
  await postAdminMutation(`/admin-v2/assignments/reassign`, body, params.errorMessage);
  params.revalidate();
}
