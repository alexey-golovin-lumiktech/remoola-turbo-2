import { loadDocumentsPage } from './page.loader';
import { parseDocumentsSearchParams } from './page.params';
import { DocumentsPageView } from './page.view';

type DocumentsPageParams = Record<string, string | string[] | undefined>;

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<DocumentsPageParams> }) {
  const params = parseDocumentsSearchParams(await searchParams);
  const data = await loadDocumentsPage(params);
  return <DocumentsPageView data={data} />;
}
