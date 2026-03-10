import { EmptyState } from '../../shared/ui/EmptyState';
import { DocumentIcon } from '../../shared/ui/icons/DocumentIcon';

import type { DocumentItem } from './queries';

interface DocumentsViewProps {
  items: DocumentItem[];
}

function getField(item: DocumentItem, key: string): unknown {
  if (item == null || typeof item !== `object`) return undefined;
  return key in item ? item[key] : undefined;
}

export function DocumentsView({ items }: DocumentsViewProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<DocumentIcon className={`h-8 w-8`} strokeWidth={2} />}
        title="No documents yet"
        description="Upload documents to keep track of invoices, receipts, and contracts."
      />
    );
  }
  return (
    <div className={`space-y-4`} data-testid="consumer-mobile-documents">
      <h2
        className={`
        text-lg
        font-semibold
        text-slate-800
        dark:text-slate-200
      `}
      >
        Documents
      </h2>
      <ul className={`space-y-3`}>
        {items.map((item) => {
          const id = getField(item, `id`) as string | undefined;
          const name = getField(item, `name`) as string | undefined;
          const createdAt = getField(item, `createdAt`) as string | undefined;
          const key = id ?? String(Math.random());
          return (
            <li
              key={key}
              className={`
                group
                relative
                overflow-hidden
                rounded-xl
                border
                border-slate-200
                bg-white
                p-4
                shadow-xs
                transition-all
                duration-200
                hover:shadow-md
                dark:border-slate-700
                dark:bg-slate-800
              `}
            >
              <div
                className={`
                absolute
                right-0
                top-0
                h-full
                w-1
                bg-primary-500
                opacity-0
                transition-opacity
                duration-200
                group-hover:opacity-100
              `}
              />
              <div className={`flex items-center gap-3`}>
                <div
                  className={`
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-slate-100
                  text-slate-600
                  dark:bg-slate-700
                  dark:text-slate-300
                `}
                >
                  <DocumentIcon className={`h-5 w-5`} strokeWidth={2} />
                </div>
                <div className={`flex-1 min-w-0`}>
                  <span
                    className={`
                    block
                    truncate
                    font-semibold
                    text-slate-900
                    dark:text-white
                  `}
                  >
                    {name ?? id ?? `Document`}
                  </span>
                  {createdAt && (
                    <p
                      className={`
                      mt-0.5
                      text-xs
                      text-slate-500
                      dark:text-slate-400
                    `}
                    >
                      {new Date(createdAt).toLocaleDateString(undefined, {
                        year: `numeric`,
                        month: `short`,
                        day: `numeric`,
                      })}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
