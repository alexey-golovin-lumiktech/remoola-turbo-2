import styles from './DocumentsView.module.css';
import { type DocumentItem } from './queries';
import { EmptyState } from '../../shared/ui/EmptyState';
import { DocumentIcon } from '../../shared/ui/icons/DocumentIcon';

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
        icon={<DocumentIcon className={styles.emptyIcon} strokeWidth={2} />}
        title="No documents yet"
        description="Upload documents to keep track of invoices, receipts, and contracts."
      />
    );
  }
  return (
    <div className={styles.wrap} data-testid="consumer-mobile-documents">
      <h2 className={styles.title}>Documents</h2>
      <ul className={styles.list}>
        {items.map((item) => {
          const id = getField(item, `id`) as string | undefined;
          const name = getField(item, `name`) as string | undefined;
          const createdAt = getField(item, `createdAt`) as string | undefined;
          const key = id ?? String(Math.random());
          return (
            <li key={key} className={styles.card}>
              <div className={styles.bar} />
              <div className={styles.row}>
                <div className={styles.iconWrap}>
                  <DocumentIcon className={styles.icon} strokeWidth={2} />
                </div>
                <div className={styles.main}>
                  <span className={styles.name}>{name ?? id ?? `Document`}</span>
                  {createdAt ? (
                    <p className={styles.meta}>
                      {new Date(createdAt).toLocaleDateString(undefined, {
                        year: `numeric`,
                        month: `short`,
                        day: `numeric`,
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
