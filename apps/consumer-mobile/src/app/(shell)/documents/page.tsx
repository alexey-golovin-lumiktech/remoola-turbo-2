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
        min-h-screen
        pb-20
      "
      data-testid="consumer-documents-page"
    >
      <div
        className="
          sticky
          top-0
          z-10
          backdrop-blur-xl
          bg-white/80
          dark:bg-slate-900/80
          border-b
          border-slate-200/50
          dark:border-slate-700/50
          px-4
          py-4
          sm:px-6
          lg:px-8
        "
      >
        <div
          className="
            mx-auto
            max-w-5xl
          "
        >
          <div
            className="
              flex
              flex-col
              gap-2
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div>
              <h1
                className="
                  text-2xl
                  font-bold
                  text-slate-900
                  sm:text-3xl
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
          </div>
        </div>
      </div>
      <div
        className="
          mx-auto
          max-w-5xl
          px-4
          pt-4
          sm:px-6
          lg:px-8
        "
      >
        <EnhancedDocumentsView items={items} />
      </div>
    </div>
  );
}
