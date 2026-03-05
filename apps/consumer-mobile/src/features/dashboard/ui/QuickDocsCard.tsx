import Link from 'next/link';

interface QuickDoc {
  id: string;
  name: string;
  createdAt: string;
}

interface QuickDocsCardProps {
  documents: QuickDoc[];
  maxItems?: number;
}

/**
 * QuickDocsCard - Quick access to recent documents
 */
export function QuickDocsCard({ documents, maxItems = 3 }: QuickDocsCardProps) {
  const displayedDocs = documents.slice(0, maxItems);

  if (displayedDocs.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Quick documents</h3>
          <Link
            href="/documents"
            className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            View all
          </Link>
        </div>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {displayedDocs.map((doc) => (
          <Link
            key={doc.id}
            href={`/documents#${doc.id}`}
            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{doc.name}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {new Date(doc.createdAt).toLocaleDateString(undefined, {
                  month: `short`,
                  day: `numeric`,
                  year: `numeric`,
                })}
              </p>
            </div>

            <svg
              className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
