import { type Metadata } from 'next';

import { DocumentsList } from '../../../components';

export const metadata: Metadata = {
  title: `Documents - Remoola`,
};

export default function DocumentsPage() {
  return (
    <div className="px-8 py-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Documents</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Access all your uploaded and payment-related files.
      </p>

      <DocumentsList />
    </div>
  );
}
