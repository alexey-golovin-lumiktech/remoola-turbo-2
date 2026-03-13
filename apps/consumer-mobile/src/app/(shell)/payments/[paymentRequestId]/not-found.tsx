import Link from 'next/link';

import styles from './not-found.module.css';
import { DocumentIcon } from '../../../../shared/ui/icons/DocumentIcon';

export default function PaymentNotFound() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        <div className={styles.iconWrap}>
          <DocumentIcon className={styles.icon} />
        </div>
        <h1 className={styles.title}>Payment not found</h1>
        <p className={styles.message}>
          The payment you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>
        <Link href="/payments" className={styles.link}>
          Back to payments
        </Link>
      </div>
    </div>
  );
}
