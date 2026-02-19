import { type Metadata } from 'next';

import { DocumentsList } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';

const { pageContainer, pageSubtitle, pageTitle } = styles;

export const metadata: Metadata = {
  title: `Documents - Remoola`,
};

export default function DocumentsPage() {
  return (
    <div className={pageContainer} data-testid="consumer-documents-page">
      <h1 className={pageTitle}>Documents</h1>
      <p className={pageSubtitle}>Access all your uploaded and payment-related files.</p>

      <DocumentsList />
    </div>
  );
}
