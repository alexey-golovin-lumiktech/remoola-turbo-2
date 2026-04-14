import Link from 'next/link';

import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../../features/help/ui';
import { getContacts, getExchangeCurrencies, getSettings } from '../../../../lib/consumer-api.server';
import {
  normalizePaymentRequestContacts,
  normalizePaymentRequestCurrencies,
} from '../../../../lib/payment-request-normalizers';
import { CreatePaymentRequestForm } from '../CreatePaymentRequestForm';
import { parsePaymentEntryPrefillEmail } from '../payment-entry-prefill';
import { buildPaymentEntryHref, getPaymentFlowBackHref, parsePaymentFlowContext } from '../payment-flow-context';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NewPaymentRequestPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const paymentFlowContext = parsePaymentFlowContext({
    contractId: resolvedSearchParams?.contractId,
    returnTo: resolvedSearchParams?.returnTo,
  });
  const [contactsResponse, exchangeCurrencies, settings] = await Promise.all([
    getContacts(1, 100),
    getExchangeCurrencies({
      redirectTo: buildPaymentEntryHref(`/payments/new-request`, {
        email: parsePaymentEntryPrefillEmail(resolvedSearchParams?.email),
        ...paymentFlowContext,
      }),
    }),
    getSettings({
      redirectTo: buildPaymentEntryHref(`/payments/new-request`, {
        email: parsePaymentEntryPrefillEmail(resolvedSearchParams?.email),
        ...paymentFlowContext,
      }),
    }),
  ]);
  const contacts = normalizePaymentRequestContacts(contactsResponse);
  const currencies = normalizePaymentRequestCurrencies(exchangeCurrencies);
  const preferredCurrency = settings?.preferredCurrency ?? `USD`;
  const initialEmail = parsePaymentEntryPrefillEmail(resolvedSearchParams?.email);
  const paymentRequestHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.PAYMENTS_NEW_REQUEST,
    preferredSlugs: [
      HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST,
      HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
      HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH,
    ],
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.3em] text-[var(--app-primary)]">Payments</div>
          <h1 className="mt-1 text-2xl font-bold text-white/90">New Payment Request</h1>
          <p className="mt-1 text-sm text-white/50">Create a new payment request and send it to a recipient.</p>
        </div>
        <Link
          href={getPaymentFlowBackHref(paymentFlowContext)}
          className="text-sm text-[var(--app-primary)] hover:opacity-80"
        >
          {paymentFlowContext?.contractId ? `Back to contract` : `Back to payments`}
        </Link>
      </div>

      <HelpContextualGuides
        guides={paymentRequestHelpGuides}
        compact
        title="Guides for payment-request setup"
        description="Use these guides if you want a quick reminder on the request flow, when attachments happen, or what changes after the draft is created."
        className="mb-6"
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <CreatePaymentRequestForm
          contacts={contacts}
          currencies={currencies}
          preferredCurrency={preferredCurrency}
          initialEmail={initialEmail}
          paymentFlowContext={paymentFlowContext}
        />
      </div>
    </div>
  );
}
