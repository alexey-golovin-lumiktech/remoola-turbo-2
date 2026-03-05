import { cookies } from 'next/headers';

import { getDocumentsList } from '../../../features/documents';
import { EnhancedDocumentsView } from '../../../features/documents/ui/EnhancedDocumentsView';

export default async function DocumentsPage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();
  const items = await getDocumentsList(cookie);
  return (
    <div
      className="
        mx-auto
        max-w-md
        space-y-4
        p-4
      "
      data-testid="consumer-documents-page"
    >
      <div>
        <h1
          className="
            text-2xl
            font-bold
            text-slate-900
            dark:text-white
          "
        >
          Documents
        </h1>
        <p
          className="
            mt-1
            text-sm
            text-slate-600
            dark:text-slate-400
          "
        >
          Access all your uploaded and payment-related files.
        </p>
      </div>
      <EnhancedDocumentsView items={items} />
    </div>
  );
}
