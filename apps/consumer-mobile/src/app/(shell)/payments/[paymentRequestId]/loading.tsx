import styles from './loading.module.css';
import { Card, CardHeader, CardContent } from '../../../../shared/ui/Card';

export default function PaymentDetailLoading() {
  return (
    <div className={styles.wrapper} data-testid="payment-detail-loading">
      <div className={styles.header}>
        <div className={styles.headerTitle} />
      </div>

      <Card noPadding>
        <CardHeader>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardHeaderLeft}>
              <div className={styles.cardHeaderLine1} />
              <div className={styles.cardHeaderLine2} />
              <div className={styles.cardHeaderLine3} />
            </div>
            <div className={styles.cardHeaderBadge} />
          </div>
        </CardHeader>

        <CardContent className={styles.cardContentBordered}>
          <div className={styles.sectionTitle} />
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.row}>
              <div className={styles.rowAvatar} />
              <div className={styles.rowContent}>
                <div className={styles.rowLine1} />
                <div className={styles.rowLine2} />
              </div>
            </div>
          ))}
        </CardContent>

        <CardContent className={styles.cardContentSection}>
          <div className={styles.sectionTitle2} />
          {[1, 2].map((i) => (
            <div key={i} className={styles.itemRow}>
              <div className={styles.itemLeft}>
                <div className={styles.itemIcon} />
                <div className={styles.itemContent}>
                  <div className={styles.itemLine1} />
                  <div className={styles.itemLine2} />
                </div>
              </div>
              <div className={styles.itemRight} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className={styles.actions}>
        <div className={styles.actionBtn} />
        <div className={styles.actionBtn} />
      </div>
    </div>
  );
}
