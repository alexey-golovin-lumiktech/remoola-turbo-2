import { type Metadata } from 'next';

import { ContactDetailsView } from '../../../../../components';

export const metadata: Metadata = {
  title: `Contact Details - Remoola`,
};

export default async function ContactDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContactDetailsView id={id} />;
}
