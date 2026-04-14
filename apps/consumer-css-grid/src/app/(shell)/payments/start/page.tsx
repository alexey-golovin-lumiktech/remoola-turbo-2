import Link from 'next/link';

import { parseResumeStartPaymentFlag } from './start-payment-draft-flow';
import { StartPaymentClient } from './StartPaymentClient';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../../features/help/ui';
import { getSettings } from '../../../../lib/consumer-api.server';
import { CreditCardIcon } from '../../../../shared/ui/icons/CreditCardIcon';
import { PageHeader } from '../../../../shared/ui/shell-primitives';
import { parsePaymentEntryPrefillEmail } from '../payment-entry-prefill';
import { buildPaymentEntryHref, getPaymentFlowBackHref, parsePaymentFlowContext } from '../payment-flow-context';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function StartPaymentPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const paymentFlowContext = parsePaymentFlowContext({
    contractId: resolvedSearchParams?.contractId,
    returnTo: resolvedSearchParams?.returnTo,
  });
  const initialEmail = parsePaymentEntryPrefillEmail(resolvedSearchParams?.email);
  const settings = await getSettings({
    redirectTo: buildPaymentEntryHref(`/payments/start`, {
      email: initialEmail,
      ...paymentFlowContext,
    }),
  });
  const preferredCurrency = settings?.preferredCurrency ?? `USD`;
  const resumeFromDraft = parseResumeStartPaymentFlag(resolvedSearchParams?.resumeStartPayment);
  const startPaymentHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.PAYMENTS_START,
    preferredSlugs: [
      HELP_GUIDE_SLUG.PAYMENTS_START_PAYMENT,
      HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
      HELP_GUIDE_SLUG.PAYMENTS_STATUSES,
    ],
  });

  return (
    <div>
      <PageHeader
        title="Start Payment"
        subtitle="Create a one-off payer-side payment and continue into the normal payment detail flow."
        icon={<CreditCardIcon className="h-10 w-10 text-white" />}
        action={
          <Link
            href={getPaymentFlowBackHref(paymentFlowContext)}
            className="text-sm text-[var(--app-primary)] hover:opacity-80"
          >
            {paymentFlowContext?.contractId ? `Back to contract` : `Back to payments`}
          </Link>
        }
      />
      <HelpContextualGuides
        guides={startPaymentHelpGuides}
        compact
        title="Guides for payer-side payment setup"
        description="These guides explain when to use start payment, how the flow differs from a request, and where status handling moves after creation."
        className="mb-5"
      />
      <StartPaymentClient
        preferredCurrency={preferredCurrency}
        resumeFromDraft={resumeFromDraft}
        initialEmail={initialEmail}
        paymentFlowContext={paymentFlowContext}
      />
    </div>
  );
}
