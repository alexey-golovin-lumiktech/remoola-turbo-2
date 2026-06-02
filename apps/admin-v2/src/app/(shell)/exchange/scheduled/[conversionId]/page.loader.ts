import { getExchangeScheduledCaseResult } from '../../../../../lib/admin-api/exchange.server';
import { getAdminIdentity } from '../../../../../lib/admin-api/identity.server';
import {
  loadReassignCandidates,
  type ReassignCandidate,
} from '../../../../../lib/admin-permissions/reassign-candidates';

type ConversionResult = Awaited<ReturnType<typeof getExchangeScheduledCaseResult>>;
type ConversionReady = Extract<ConversionResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;

export type ExchangeScheduledCasePageData = {
  identity: Identity;
  conversion: ConversionReady[`data`];
  reassignCandidates: ReassignCandidate[];
};

type ExchangeScheduledCasePageLoadResult =
  | { status: `ready`; data: ExchangeScheduledCasePageData }
  | { status: `not_found` }
  | { status: `forbidden` }
  | { status: `error` };

export async function loadExchangeScheduledCasePage({
  conversionId,
}: {
  conversionId: string;
}): Promise<ExchangeScheduledCasePageLoadResult> {
  const [identity, conversionResult] = await Promise.all([
    getAdminIdentity(),
    getExchangeScheduledCaseResult(conversionId),
  ]);

  if (conversionResult.status === `not_found`) {
    return { status: `not_found` };
  }
  if (conversionResult.status === `forbidden`) {
    return { status: `forbidden` };
  }
  if (conversionResult.status === `error`) {
    return { status: `error` };
  }

  const conversion = conversionResult.data;
  const canReassign = Boolean(conversion.assignment.current && identity?.role === `SUPER_ADMIN`);
  const reassignCandidates = await loadReassignCandidates({ canReassign, assignment: conversion.assignment });

  return {
    status: `ready`,
    data: { identity, conversion, reassignCandidates },
  };
}
