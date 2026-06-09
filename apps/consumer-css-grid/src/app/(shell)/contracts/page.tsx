import { Suspense } from 'react';

import { parseContractsSearchParams, type ContractsSearchParams } from './contracts-search-params';
import { ContractsClient } from './ContractsClient';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../features/help/ui';
import { getContractsResult } from '../../../lib/consumer-api.server';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { PageHeader, WorkspaceUnavailableBanner } from '../../../shared/ui/shell-page-layout';

export default async function ContractsPage({ searchParams }: { searchParams?: Promise<ContractsSearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { page, pageSize, query, status, hasDocuments, hasPayments, sort } =
    parseContractsSearchParams(resolvedSearchParams);
  const contractsHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.CONTRACTS,
    preferredSlugs: [
      HELP_GUIDE_SLUG.CONTRACTS_RELATIONSHIPS_AND_NEXT_STEPS,
      HELP_GUIDE_SLUG.CONTRACTS_OVERVIEW,
      HELP_GUIDE_SLUG.CONTRACTS_COMMON_ISSUES,
    ],
    limit: 3,
  });

  return (
    <div>
      <PageHeader title="Contracts" icon={<DocumentIcon className="h-10 w-10 text-(--app-text)" />} />
      <HelpContextualGuides
        guides={contractsHelpGuides}
        title="Understand the contract workflow before drilling in"
        description="These guides explain how contract filters, relationship context, and next-step links connect this workspace to contacts, documents, and payment follow-up."
        className="mb-5"
      />
      <Suspense
        fallback={
          <div className="rounded-[28px] border border-(--app-border) bg-(--app-surface) p-5 text-sm text-(--app-text-muted) shadow-(--app-shadow)">
            Loading contracts...
          </div>
        }
      >
        <ContractsWorkspaceSection
          hasDocuments={hasDocuments}
          hasPayments={hasPayments}
          page={page}
          pageSize={pageSize}
          query={query}
          sort={sort}
          status={status}
        />
      </Suspense>
    </div>
  );
}

async function ContractsWorkspaceSection({
  hasDocuments,
  hasPayments,
  page,
  pageSize,
  query,
  sort,
  status,
}: ReturnType<typeof parseContractsSearchParams>) {
  const contractsResult = await getContractsResult({ page, pageSize, query, status, hasDocuments, hasPayments, sort });
  const contractsResponse = contractsResult.data;
  const contracts = contractsResponse?.items ?? [];

  return (
    <>
      {contractsResult.unavailable ? (
        <WorkspaceUnavailableBanner
          title="Contracts data is temporarily unavailable"
          text="The contracts workspace could not load live relationship data from the backend right now. You can still use navigation and retry the workspace later."
        />
      ) : null}
      <ContractsClient
        contracts={contracts}
        total={contractsResponse?.total ?? contracts.length}
        page={contractsResponse?.page ?? page}
        pageSize={contractsResponse?.pageSize ?? pageSize}
        initialQuery={query}
        initialStatus={status}
        initialHasDocuments={hasDocuments}
        initialHasPayments={hasPayments}
        initialSort={sort}
      />
    </>
  );
}
