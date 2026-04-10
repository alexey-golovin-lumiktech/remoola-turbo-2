import { describe, expect, it } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';

import { ContractDetailView } from './ContractDetailView';

describe(`ContractDetailView`, () => {
  it(`renders an unavailable state when the contract is missing`, () => {
    const html = renderToStaticMarkup(<ContractDetailView contract={null} contractId="contract-1" />);

    expect(html).toContain(`Contract details are unavailable for this relationship.`);
    expect(html).toContain(`Back to contracts`);
  });

  it(`renders payment history, files, and active workflow for an existing contract`, () => {
    const html = renderToStaticMarkup(
      <ContractDetailView
        contract={{
          id: `contract-1`,
          name: `Vendor LLC`,
          email: `vendor@example.com`,
          updatedAt: `2026-03-30T07:15:00.000Z`,
          address: {
            street: `221B Baker Street`,
            city: `London`,
            state: `Greater London`,
            postalCode: `NW1 6XE`,
            country: `United Kingdom`,
          },
          summary: {
            lastStatus: `completed`,
            lastActivity: `2026-03-31T09:15:00.000Z`,
            lastRequestId: `payment-1`,
            documentsCount: 1,
            paymentsCount: 1,
            completedPaymentsCount: 1,
            draftPaymentsCount: 0,
            pendingPaymentsCount: 0,
            waitingPaymentsCount: 0,
          },
          payments: [
            {
              id: `payment-1`,
              amount: `$100.00`,
              status: `completed`,
              createdAt: `2026-03-30T09:15:00.000Z`,
              updatedAt: `2026-03-31T09:15:00.000Z`,
              role: `REQUESTER`,
              paymentRail: null,
            },
          ],
          documents: [
            {
              id: `document-1`,
              name: `contract.pdf`,
              downloadUrl: `https://example.com/document-1`,
              createdAt: `2026-03-30T08:15:00.000Z`,
              tags: [`contract`],
              isAttachedToDraftPaymentRequest: false,
              attachedDraftPaymentRequestIds: [],
              isAttachedToNonDraftPaymentRequest: true,
              attachedNonDraftPaymentRequestIds: [`payment-1`],
            },
          ],
        }}
        contractId="contract-1"
      />,
    );

    expect(html).toContain(`Vendor LLC`);
    expect(html).toContain(`Relationship timeline`);
    expect(html).toContain(`Payment history for this contract`);
    expect(html).toContain(`Files for this contract`);
    expect(html).toContain(`Active workflow`);
    expect(html).toContain(`Drafts`);
    expect(html).toContain(`Pending`);
    expect(html).toContain(`Waiting`);
    expect(html).toContain(`Latest workflow is closed`);
    expect(html).toContain(`Open latest payment`);
    expect(html).toContain(`/payments/payment-1?contractId=contract-1&amp;returnTo=%2Fcontracts%2Fcontract-1`);
    expect(html).toContain(
      `/payments/new-request?contractId=contract-1&amp;returnTo=%2Fcontracts%2Fcontract-1&amp;email=vendor%40example.com`,
    );
    expect(html).toContain(
      `/payments/start?contractId=contract-1&amp;returnTo=%2Fcontracts%2Fcontract-1&amp;email=vendor%40example.com`,
    );
    expect(html).toContain(`/contacts?edit=contract-1&amp;returnTo=%2Fcontracts%2Fcontract-1`);
    expect(html).toContain(`/documents?contactId=contract-1&amp;returnTo=%2Fcontracts%2Fcontract-1`);
    expect(html).toContain(`Attached to payment record`);
    expect(html).toContain(`Open payment`);
  });

  it(`surfaces a draft workflow when the active payment is still editable`, () => {
    const html = renderToStaticMarkup(
      <ContractDetailView
        contract={{
          id: `contract-1`,
          name: `Vendor LLC`,
          email: `vendor@example.com`,
          updatedAt: `2026-03-30T07:15:00.000Z`,
          address: null,
          summary: {
            lastStatus: `draft`,
            lastActivity: `2026-03-31T09:15:00.000Z`,
            lastRequestId: `payment-1`,
            documentsCount: 0,
            paymentsCount: 1,
            completedPaymentsCount: 0,
            draftPaymentsCount: 1,
            pendingPaymentsCount: 0,
            waitingPaymentsCount: 0,
          },
          payments: [
            {
              id: `payment-1`,
              amount: `$100.00`,
              status: `draft`,
              createdAt: `2026-03-30T09:15:00.000Z`,
              updatedAt: `2026-03-31T09:15:00.000Z`,
              role: `REQUESTER`,
              paymentRail: null,
            },
          ],
          documents: [],
        }}
        contractId="contract-1"
      />,
    );

    expect(html).toContain(`Draft waiting for review`);
    expect(html).toContain(`Open draft`);
    expect(html).toContain(`Send active draft`);
  });

  it(`prioritizes an older draft over a newer closed payment in the active workflow`, () => {
    const html = renderToStaticMarkup(
      <ContractDetailView
        contract={{
          id: `contract-1`,
          name: `Vendor LLC`,
          email: `vendor@example.com`,
          updatedAt: `2026-03-30T07:15:00.000Z`,
          address: null,
          summary: {
            lastStatus: `draft`,
            lastActivity: `2026-04-01T09:15:00.000Z`,
            lastRequestId: `payment-draft-1`,
            documentsCount: 0,
            paymentsCount: 2,
            completedPaymentsCount: 1,
            draftPaymentsCount: 1,
            pendingPaymentsCount: 0,
            waitingPaymentsCount: 0,
          },
          payments: [
            {
              id: `payment-completed-1`,
              amount: `$250.00`,
              status: `completed`,
              createdAt: `2026-04-01T08:15:00.000Z`,
              updatedAt: `2026-04-01T09:15:00.000Z`,
              role: `REQUESTER`,
              paymentRail: null,
            },
            {
              id: `payment-draft-1`,
              amount: `$100.00`,
              status: `draft`,
              createdAt: `2026-03-30T09:15:00.000Z`,
              updatedAt: `2026-03-31T09:15:00.000Z`,
              role: `REQUESTER`,
              paymentRail: null,
            },
          ],
          documents: [],
        }}
        contractId="contract-1"
      />,
    );

    expect(html).toContain(`Draft waiting for review`);
    expect(html).toContain(`Draft requires requester action`);
    expect(html).toContain(`/payments/payment-draft-1?contractId=contract-1&amp;returnTo=%2Fcontracts%2Fcontract-1`);
    expect(html).toContain(`Relationship status`);
    expect(html).not.toContain(`Latest workflow is closed`);
  });

  it(`surfaces a pending workflow when payer action is still required`, () => {
    const html = renderToStaticMarkup(
      <ContractDetailView
        contract={{
          id: `contract-1`,
          name: `Vendor LLC`,
          email: `vendor@example.com`,
          updatedAt: `2026-03-30T07:15:00.000Z`,
          address: null,
          summary: {
            lastStatus: `pending`,
            lastActivity: `2026-03-31T09:15:00.000Z`,
            lastRequestId: `payment-1`,
            documentsCount: 0,
            paymentsCount: 1,
            completedPaymentsCount: 0,
            draftPaymentsCount: 0,
            pendingPaymentsCount: 1,
            waitingPaymentsCount: 0,
          },
          payments: [
            {
              id: `payment-1`,
              amount: `$100.00`,
              status: `pending`,
              createdAt: `2026-03-30T09:15:00.000Z`,
              updatedAt: `2026-03-31T09:15:00.000Z`,
              role: `REQUESTER`,
              paymentRail: null,
            },
          ],
          documents: [],
        }}
        contractId="contract-1"
      />,
    );

    expect(html).toContain(`Payment needs completion`);
    expect(html).toContain(`Open pending payment`);
    expect(html).toContain(`Start another payment`);
    expect(html).toContain(`Waiting for payer action`);
  });

  it(`surfaces a waiting workflow when settlement is already in flight`, () => {
    const html = renderToStaticMarkup(
      <ContractDetailView
        contract={{
          id: `contract-1`,
          name: `Vendor LLC`,
          email: `vendor@example.com`,
          updatedAt: `2026-03-30T07:15:00.000Z`,
          address: null,
          summary: {
            lastStatus: `waiting`,
            lastActivity: `2026-03-31T09:15:00.000Z`,
            lastRequestId: `payment-1`,
            documentsCount: 0,
            paymentsCount: 1,
            completedPaymentsCount: 0,
            draftPaymentsCount: 0,
            pendingPaymentsCount: 0,
            waitingPaymentsCount: 1,
          },
          payments: [
            {
              id: `payment-1`,
              amount: `$100.00`,
              status: `waiting`,
              createdAt: `2026-03-30T09:15:00.000Z`,
              updatedAt: `2026-03-31T09:15:00.000Z`,
              role: `REQUESTER`,
              paymentRail: null,
            },
          ],
          documents: [],
        }}
        contractId="contract-1"
      />,
    );

    expect(html).toContain(`Waiting for settlement outcome`);
    expect(html).toContain(`Open latest payment`);
    expect(html).toContain(`Request another payment`);
    expect(html).toContain(`In settlement`);
  });

  it(`surfaces a no-activity workflow when the relationship has no payments yet`, () => {
    const html = renderToStaticMarkup(
      <ContractDetailView
        contract={{
          id: `contract-1`,
          name: `Vendor LLC`,
          email: `vendor@example.com`,
          updatedAt: `2026-03-30T07:15:00.000Z`,
          address: null,
          summary: {
            lastStatus: null,
            lastActivity: null,
            lastRequestId: null,
            documentsCount: 0,
            paymentsCount: 0,
            completedPaymentsCount: 0,
            draftPaymentsCount: 0,
            pendingPaymentsCount: 0,
            waitingPaymentsCount: 0,
          },
          payments: [],
          documents: [],
        }}
        contractId="contract-1"
      />,
    );

    expect(html).toContain(`No payment workflow yet`);
    expect(html).toContain(`Ready to request payment`);
    expect(html).toContain(`Request payment`);
    expect(html).toContain(
      `/payments/start?contractId=contract-1&amp;returnTo=%2Fcontracts%2Fcontract-1&amp;email=vendor%40example.com`,
    );
  });

  it(`preserves list context for back and workflow links`, () => {
    const html = renderToStaticMarkup(
      <ContractDetailView
        contract={{
          id: `contract-1`,
          name: `Vendor LLC`,
          email: `vendor@example.com`,
          updatedAt: `2026-03-30T07:15:00.000Z`,
          address: null,
          summary: {
            lastStatus: `completed`,
            lastActivity: `2026-03-31T09:15:00.000Z`,
            lastRequestId: `payment-1`,
            documentsCount: 0,
            paymentsCount: 1,
            completedPaymentsCount: 1,
            draftPaymentsCount: 0,
            pendingPaymentsCount: 0,
            waitingPaymentsCount: 0,
          },
          payments: [
            {
              id: `payment-1`,
              amount: `$100.00`,
              status: `completed`,
              createdAt: `2026-03-30T09:15:00.000Z`,
              updatedAt: `2026-03-31T09:15:00.000Z`,
              role: `REQUESTER`,
              paymentRail: null,
            },
          ],
          documents: [],
        }}
        contractId="contract-1"
        returnToContractsHref="/contracts?status=waiting&page=2"
      />,
    );

    expect(html).toContain(`/contracts?status=waiting&amp;page=2`);
    expect(html).toContain(
      `/payments/payment-1?contractId=contract-1&amp;returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2`,
    );
  });

  it(`surfaces file-to-draft linkage with contract-aware payment navigation`, () => {
    const html = renderToStaticMarkup(
      <ContractDetailView
        contract={{
          id: `contract-1`,
          name: `Vendor LLC`,
          email: `vendor@example.com`,
          updatedAt: `2026-03-30T07:15:00.000Z`,
          address: null,
          summary: {
            lastStatus: `draft`,
            lastActivity: `2026-03-31T09:15:00.000Z`,
            lastRequestId: `payment-draft-1`,
            documentsCount: 1,
            paymentsCount: 1,
            completedPaymentsCount: 0,
            draftPaymentsCount: 1,
            pendingPaymentsCount: 0,
            waitingPaymentsCount: 0,
          },
          payments: [
            {
              id: `payment-draft-1`,
              amount: `$100.00`,
              status: `draft`,
              createdAt: `2026-03-30T09:15:00.000Z`,
              updatedAt: `2026-03-31T09:15:00.000Z`,
              role: `REQUESTER`,
              paymentRail: null,
            },
          ],
          documents: [
            {
              id: `document-1`,
              name: `invoice.pdf`,
              downloadUrl: `https://example.com/document-1`,
              createdAt: `2026-03-30T08:15:00.000Z`,
              tags: [`invoice`],
              isAttachedToDraftPaymentRequest: true,
              attachedDraftPaymentRequestIds: [`payment-draft-1`],
              isAttachedToNonDraftPaymentRequest: false,
              attachedNonDraftPaymentRequestIds: [],
            },
          ],
        }}
        contractId="contract-1"
        returnToContractsHref="/contracts?status=pending&page=3"
      />,
    );

    expect(html).toContain(`Draft file actions stay inside this contract workflow`);
    expect(html).toContain(`1 file already linked to draft work`);
    expect(html).toContain(`0 files not yet linked to a draft`);
    expect(html).toContain(`Open contract files workspace`);
    expect(html).toContain(`Attached to draft payment request`);
    expect(html).toContain(`Open draft`);
    expect(html).toContain(
      `/payments/payment-draft-1?contractId=contract-1&amp;returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dpending%26page%3D3`,
    );
  });

  it(`marks files that are not yet linked to current draft work`, () => {
    const html = renderToStaticMarkup(
      <ContractDetailView
        contract={{
          id: `contract-1`,
          name: `Vendor LLC`,
          email: `vendor@example.com`,
          updatedAt: `2026-03-30T07:15:00.000Z`,
          address: null,
          summary: {
            lastStatus: `draft`,
            lastActivity: `2026-03-31T09:15:00.000Z`,
            lastRequestId: `payment-draft-1`,
            documentsCount: 1,
            paymentsCount: 2,
            completedPaymentsCount: 1,
            draftPaymentsCount: 1,
            pendingPaymentsCount: 0,
            waitingPaymentsCount: 0,
          },
          payments: [
            {
              id: `payment-draft-1`,
              amount: `$100.00`,
              status: `draft`,
              createdAt: `2026-03-30T09:15:00.000Z`,
              updatedAt: `2026-03-31T09:15:00.000Z`,
              role: `REQUESTER`,
              paymentRail: null,
            },
            {
              id: `payment-closed-1`,
              amount: `$50.00`,
              status: `completed`,
              createdAt: `2026-03-20T09:15:00.000Z`,
              updatedAt: `2026-03-21T09:15:00.000Z`,
              role: `REQUESTER`,
              paymentRail: null,
            },
          ],
          documents: [
            {
              id: `document-1`,
              name: `invoice.pdf`,
              downloadUrl: `https://example.com/document-1`,
              createdAt: `2026-03-30T08:15:00.000Z`,
              tags: [`invoice`],
              isAttachedToDraftPaymentRequest: false,
              attachedDraftPaymentRequestIds: [],
              isAttachedToNonDraftPaymentRequest: true,
              attachedNonDraftPaymentRequestIds: [`payment-closed-1`],
            },
          ],
        }}
        contractId="contract-1"
      />,
    );

    expect(html).toContain(`1 file not yet linked to a draft`);
    expect(html).toContain(`Not linked to current draft work`);
    expect(html).toContain(`Attached to payment record`);
  });
});
