import { describe, expect, it } from '@jest/globals';

import {
  buildContractDetailHref,
  buildContractFilesWorkspaceHref,
  buildContractPaymentDetailHref,
  buildEditContactHref,
  resolveContractWorkflowActions,
} from './contract-workflow-actions';

describe(`contract workflow actions`, () => {
  const baseInput = {
    contractId: `contract-1`,
    email: `vendor@example.com`,
    returnToContractsHref: `/contracts?status=waiting&page=2`,
  };

  it(`builds contract-aware href helpers`, () => {
    expect(buildContractDetailHref(`contract-1`, `/contracts?status=waiting&page=2`)).toBe(
      `/contracts/contract-1?returnTo=%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2`,
    );
    expect(buildContractPaymentDetailHref(`payment-1`, `contract-1`, `/contracts?status=waiting&page=2`)).toBe(
      `/payments/payment-1?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2`,
    );
    expect(buildContractFilesWorkspaceHref(`contract-1`, `/contracts?status=waiting&page=2`)).toBe(
      `/documents?contactId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%252Fcontracts%253Fstatus%253Dwaiting%2526page%253D2`,
    );
    expect(buildEditContactHref(`contract-1`, `/contracts?status=waiting&page=2`)).toBe(
      `/contacts?edit=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%252Fcontracts%253Fstatus%253Dwaiting%2526page%253D2`,
    );
  });

  it(`prioritizes the active draft workflow`, () => {
    const result = resolveContractWorkflowActions({
      ...baseInput,
      status: `draft`,
      lastRequestId: `payment-draft-1`,
    });

    expect(result).toEqual({
      status: `draft`,
      title: `Draft waiting for review`,
      detail: `An open draft still exists for this contractor relationship. Open it from here to review attachments, invoice state, and send timing.`,
      primaryAction: {
        label: `Open draft`,
        href: `/payments/payment-draft-1?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2`,
      },
      secondaryActions: [
        {
          label: `Request another payment`,
          href: `/payments/new-request?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2&email=vendor%40example.com`,
        },
      ],
    });
  });

  it(`prioritizes the pending payer workflow`, () => {
    const result = resolveContractWorkflowActions({
      ...baseInput,
      status: `pending`,
      lastRequestId: `payment-pending-1`,
    });

    expect(result.primaryAction).toEqual({
      label: `Open pending payment`,
      href: `/payments/payment-pending-1?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2`,
    });
    expect(result.secondaryActions).toEqual([
      {
        label: `Start another payment`,
        href: `/payments/start?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2&email=vendor%40example.com`,
      },
    ]);
  });

  it(`keeps waiting relationships on the in-flight payment`, () => {
    const result = resolveContractWorkflowActions({
      ...baseInput,
      status: `waiting`,
      lastRequestId: `payment-waiting-1`,
    });

    expect(result.primaryAction).toEqual({
      label: `Open latest payment`,
      href: `/payments/payment-waiting-1?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2`,
    });
    expect(result.secondaryActions).toEqual([
      {
        label: `Request another payment`,
        href: `/payments/new-request?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2&email=vendor%40example.com`,
      },
    ]);
  });

  it(`keeps completed relationships aligned with detail-level closed workflow contract`, () => {
    const result = resolveContractWorkflowActions({
      ...baseInput,
      status: `completed`,
      lastRequestId: `payment-completed-1`,
    });

    expect(result.primaryAction).toEqual({
      label: `Open latest payment`,
      href: `/payments/payment-completed-1?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2`,
    });
    expect(result.secondaryActions).toEqual([
      {
        label: `Request payment`,
        href: `/payments/new-request?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2&email=vendor%40example.com`,
      },
      {
        label: `Start payment`,
        href: `/payments/start?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2&email=vendor%40example.com`,
      },
    ]);
  });

  it(`uses request then start actions when the relationship has no activity`, () => {
    const result = resolveContractWorkflowActions({
      ...baseInput,
      status: null,
      lastRequestId: null,
    });

    expect(result).toEqual({
      status: `no_activity`,
      title: `No payment workflow yet`,
      detail: `This relationship has no payment history. Start from this contract to keep the next payment attached to the same operating context.`,
      primaryAction: {
        label: `Request payment`,
        href: `/payments/new-request?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2&email=vendor%40example.com`,
      },
      secondaryActions: [
        {
          label: `Start payment`,
          href: `/payments/start?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2&email=vendor%40example.com`,
        },
      ],
    });
  });
});
