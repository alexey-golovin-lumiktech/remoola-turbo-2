import { type Metadata } from 'next';

import { ContractsTable } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';

const { pageStackContainer, pageSubtitleGray, pageTitleGray } = styles;

export const metadata: Metadata = {
  title: `Contracts - Remoola`,
};

export default async function ContractsPage() {
  return (
    <div className={pageStackContainer} data-testid="consumer-contracts-page">
      {/* Title */}
      <div>
        <h1 className={pageTitleGray}>Contracts</h1>
        <p className={pageSubtitleGray}>All your contractors and their latest payment activity.</p>
      </div>

      <ContractsTable />
    </div>
  );
}
