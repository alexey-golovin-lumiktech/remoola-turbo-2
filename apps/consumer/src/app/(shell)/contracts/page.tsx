import { ContractsTable } from '../../../components';
import {
  cardBaseSoftCompact,
  pageStackContainer,
  pageSubtitleGray,
  pageTitleGray,
} from '../../../components/ui/classNames';

export default async function ContractsPage() {
  return (
    <div className={pageStackContainer}>
      {/* Title */}
      <div>
        <h1 className={pageTitleGray}>Contracts</h1>
        <p className={pageSubtitleGray}>All your contractors and their latest payment activity.</p>
      </div>

      {/* Table */}
      <div className={cardBaseSoftCompact}>
        <ContractsTable />
      </div>
    </div>
  );
}
