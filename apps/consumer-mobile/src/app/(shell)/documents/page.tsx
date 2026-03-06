import { cookies } from 'next/headers';

import { getDocumentsList } from '../../../features/documents/queries';
import { EnhancedDocumentsView } from '../../../features/documents/ui/EnhancedDocumentsView';

export default async function DocumentsPage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();
  const items = await getDocumentsList(cookie);
  return (
    <div
      className={`
  relative
  min-h-full
  bg-gradient-to-br
  from-slate-50
  via-white
  to-slate-50
  dark:from-slate-950
  dark:via-slate-900
  dark:to-slate-950
      `}
      data-testid="consumer-documents-page"
    >
      <div
        className={`
  bg-white/95
  dark:bg-slate-900/95
  border-b
  border-slate-200/80
  dark:border-slate-700/80
  shadow-sm
  backdrop-blur-lg
  px-4
  py-6
  sm:px-6
  sm:py-7
  lg:px-8
        `}
      >
        <div className={`mx-auto max-w-6xl`}>
          <div
            className={`
  flex
  flex-col
  gap-3
  sm:flex-row
  sm:items-center
  sm:justify-between
            `}
          >
            <div className={`space-y-2`}>
              <div className={`flex items-center gap-4`}>
                <div
                  className={`
  flex
  h-12
  w-12
  items-center
  justify-center
  rounded-2xl
  bg-gradient-to-br
  from-primary-500
  to-primary-600
  shadow-lg
  shadow-primary-500/30
  ring-4
  ring-primary-50
  dark:ring-primary-950
  dark:shadow-primary-900/40
                  `}
                >
                  <svg
                    className={`h-6 w-6 text-white`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h1
                  className={`
  text-3xl
  font-extrabold
  tracking-tight
  text-slate-900
  sm:text-4xl
  dark:text-white
                  `}
                >
                  Documents
                </h1>
              </div>
              <p
                className={`
  text-sm
  font-medium
  text-slate-600
  sm:text-base
  dark:text-slate-400
  pl-0.5
                `}
              >
                Manage your uploaded files, invoices, and payment documents
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`
  mx-auto
  max-w-6xl
  px-4
  pt-6
  pb-6
  sm:px-6
  sm:pt-8
  lg:px-8
        `}
      >
        <EnhancedDocumentsView items={items} />
      </div>
    </div>
  );
}
