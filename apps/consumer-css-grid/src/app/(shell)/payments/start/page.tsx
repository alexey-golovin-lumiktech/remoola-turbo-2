import { parseResumeStartPaymentFlag } from './start-payment-draft-flow';
import { StartPaymentClient } from './StartPaymentClient';
import { getSettings } from '../../../../lib/consumer-api.server';
import { CreditCardIcon } from '../../../../shared/ui/icons/CreditCardIcon';
import { PageHeader } from '../../../../shared/ui/shell-primitives';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function StartPaymentPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const settings = await getSettings();
  const preferredCurrency = settings?.preferredCurrency ?? `USD`;
  const resumeFromDraft = parseResumeStartPaymentFlag(resolvedSearchParams?.resumeStartPayment);

  return (
    <div>
      <PageHeader
        title="Start Payment"
        subtitle="Create a one-off payer-side payment and continue into the normal payment detail flow."
        icon={<CreditCardIcon className="h-10 w-10 text-white" />}
      />
      <StartPaymentClient preferredCurrency={preferredCurrency} resumeFromDraft={resumeFromDraft} />
    </div>
  );
}
