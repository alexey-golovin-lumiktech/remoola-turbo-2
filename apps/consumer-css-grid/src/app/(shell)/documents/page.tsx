import { DocumentsClient } from './DocumentsClient';
import { getDocuments } from '../../../lib/consumer-api.server';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { PageHeader } from '../../../shared/ui/shell-primitives';

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === `string` ? value : Array.isArray(value) ? (value[0] ?? ``) : ``;
}

export default async function DocumentsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Math.max(1, Number(getSingleValue(resolvedSearchParams?.page)) || 1);
  const pageSize = Math.max(1, Number(getSingleValue(resolvedSearchParams?.pageSize)) || 20);
  const documentsResponse = await getDocuments(page, pageSize);
  const documents = documentsResponse?.items ?? [];

  return (
    <div>
      <PageHeader title="Documents" icon={<DocumentIcon className="h-10 w-10 text-white" />} />
      <DocumentsClient
        documents={documents}
        total={documentsResponse?.total ?? documents.length}
        page={documentsResponse?.page ?? page}
        pageSize={documentsResponse?.pageSize ?? pageSize}
      />
    </div>
  );
}
