import { type Metadata } from 'next';

import { DocumentsList } from '../../../components';
import { pageContainer, pageSubtitle, pageTitle } from '../../../components/ui/classNames';

export const metadata: Metadata = {
  title: `Documents - Remoola`,
};

export default function DocumentsPage() {
  return (
    <div className={pageContainer}>
      <h1 className={pageTitle}>Documents</h1>
      <p className={pageSubtitle}>Access all your uploaded and payment-related files.</p>

      <DocumentsList />
    </div>
  );
}
