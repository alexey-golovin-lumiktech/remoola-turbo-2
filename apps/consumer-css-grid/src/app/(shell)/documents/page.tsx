import { Suspense } from 'react';

import { DocumentsWorkspaceSection } from './DocumentsWorkspaceSection';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { PageHeader } from '../../../shared/ui/shell-primitives';
import { sanitizeContactsReturnTo } from '../contacts/contacts-return-to';

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === `string` ? value : Array.isArray(value) ? (value[0] ?? ``) : ``;
}

function getSafeContractsReturnTo(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith(`/contracts`)) return null;
  if (value.startsWith(`//`)) return null;
  return value;
}

export default async function DocumentsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Math.max(1, Number(getSingleValue(resolvedSearchParams?.page)) || 1);
  const pageSize = Math.max(1, Number(getSingleValue(resolvedSearchParams?.pageSize)) || 20);
  const contactId = getSingleValue(resolvedSearchParams?.contactId).trim();
  const returnTo = getSafeContractsReturnTo(sanitizeContactsReturnTo(getSingleValue(resolvedSearchParams?.returnTo)));

  return (
    <div>
      <PageHeader title="Documents" icon={<DocumentIcon className="h-10 w-10 text-white" />} />
      <Suspense
        fallback={
          <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-5 text-sm text-[var(--app-text-muted)] shadow-[var(--app-shadow)]">
            Loading documents...
          </div>
        }
      >
        <DocumentsWorkspaceSection contactId={contactId} page={page} pageSize={pageSize} returnTo={returnTo} />
      </Suspense>
    </div>
  );
}
