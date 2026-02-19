import { ContractsTable } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';

const { cardBaseSoftCompact, pageStackContainer, pageSubtitleGray, pageTitleGray } = styles;

export default async function ContractsPage() {
  return (
    <div className={pageStackContainer} data-testid="consumer-contracts-page">
      {/* Title */}
      <div>
        <h1 className={pageTitleGray}>Contracts</h1>
        <p className={pageSubtitleGray}>All your contractors and their latest payment activity.</p>
      </div>

      {/* Table */}
      <div className={cardBaseSoftCompact} data-testid="consumer-contracts-table-wrap">
        <ContractsTable />
      </div>
    </div>
  );
}
