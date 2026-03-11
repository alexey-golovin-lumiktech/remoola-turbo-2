import Link from 'next/link';

import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { NavCard } from '../../../shared/ui/NavCard';

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
    <div
      className={`
      overflow-hidden
      rounded-xl
      border
      border-slate-200
      bg-white
      shadow-xs
      dark:border-slate-700
      dark:bg-slate-800
    `}
    >
      <div
        className={`
        border-b
        border-slate-200
        bg-slate-50
        px-4
        py-3
        dark:border-slate-700
        dark:bg-slate-800/50
      `}
      >
        <div className={`flex items-center justify-between`}>
          <h3
            className={`
            text-sm
            font-semibold
            text-slate-900
            dark:text-white
          `}
          >
            Quick documents
          </h3>
          <Link
            href="/documents"
            className={`
              text-xs
              font-medium
              text-primary-600
              hover:text-primary-700
              dark:text-primary-400
            `}
          >
            View all
          </Link>
        </div>
      </div>

      <div className={`divide-y divide-slate-200 dark:divide-slate-700`}>
        {displayedDocs.map((doc) => (
          <NavCard
            key={doc.id}
            href={`/documents#${doc.id}`}
            icon={<DocumentIcon className={`h-5 w-5`} />}
            title={doc.name}
            subtitle={new Date(doc.createdAt).toLocaleDateString(undefined, {
              month: `short`,
              day: `numeric`,
              year: `numeric`,
            })}
            className={`
              group
              flex
              items-center
              justify-between
              px-4
              py-3
              transition-colors
              hover:bg-slate-50
              dark:hover:bg-slate-700/50
            `}
            iconContainerClassName={`
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-blue-100
              text-blue-600
              dark:bg-blue-900/30
              dark:text-blue-400
            `}
          />
        ))}
      </div>
    </div>
  );
}
