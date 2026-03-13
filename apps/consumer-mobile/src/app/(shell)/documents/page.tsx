import { cookies } from 'next/headers';

import styles from './page.module.css';
import { getDocumentsList } from '../../../features/documents/queries';
import { EnhancedDocumentsView } from '../../../features/documents/ui/EnhancedDocumentsView';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';

export default async function DocumentsPage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();
  const items = await getDocumentsList(cookie);
  return (
    <div className={styles.root} data-testid="consumer-documents-page">
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerRow}>
            <div className={styles.headerContent}>
              <div className={styles.headerIconRow}>
                <div className={styles.headerIconWrap}>
                  <DocumentIcon className={styles.headerIcon} />
                </div>
                <h1 className={styles.title}>Documents</h1>
              </div>
              <p className={styles.subtitle}>Manage your uploaded files, invoices, and payment documents</p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.main}>
        <EnhancedDocumentsView items={items} />
      </div>
    </div>
  );
}
