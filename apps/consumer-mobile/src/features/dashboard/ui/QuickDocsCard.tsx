import Link from 'next/link';

import styles from './QuickDocsCard.module.css';
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
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <h3 className={styles.headerTitle}>Quick documents</h3>
          <Link href="/documents" className={styles.viewAllLink}>
            View all
          </Link>
        </div>
      </div>

      <div className={styles.list}>
        {displayedDocs.map((doc) => (
          <NavCard
            key={doc.id}
            href={`/documents#${doc.id}`}
            icon={<DocumentIcon className={styles.docIcon} />}
            title={doc.name}
            subtitle={new Date(doc.createdAt).toLocaleDateString(undefined, {
              month: `short`,
              day: `numeric`,
              year: `numeric`,
            })}
            className={styles.docRow}
            iconContainerClassName={styles.docIconWrap}
          />
        ))}
      </div>
    </div>
  );
}
