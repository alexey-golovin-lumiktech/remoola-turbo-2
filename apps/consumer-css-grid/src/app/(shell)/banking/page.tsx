import { BankingClient } from './BankingClient';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../features/help/ui';
import { getPaymentMethods } from '../../../lib/consumer-api.server';
import { BankIcon } from '../../../shared/ui/icons/BankIcon';
import { PageHeader } from '../../../shared/ui/shell-primitives';

export default async function BankingPage() {
  const paymentMethodsResponse = await getPaymentMethods({ redirectTo: `/banking` });
  const accounts = paymentMethodsResponse?.items ?? [];
  const bankingHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.BANKING,
    preferredSlugs: [
      HELP_GUIDE_SLUG.BANKING_OVERVIEW,
      HELP_GUIDE_SLUG.BANKING_ADD_AND_MANAGE_METHODS,
      HELP_GUIDE_SLUG.WITHDRAWAL_MOVE_FUNDS,
      HELP_GUIDE_SLUG.BANKING_COMMON_ISSUES,
    ],
    limit: 4,
  });

  return (
    <div>
      <PageHeader title="Bank & Cards" icon={<BankIcon className="h-10 w-10 text-white" />} />
      <HelpContextualGuides
        guides={bankingHelpGuides}
        compact
        title="Use Banking as the setup surface for payout and saved methods"
        description="These guides explain how saved bank accounts and cards behave here, which method becomes the default, and what needs to be ready before a withdrawal flow can succeed."
        className="mb-5"
      />
      <BankingClient accounts={accounts} />
    </div>
  );
}
