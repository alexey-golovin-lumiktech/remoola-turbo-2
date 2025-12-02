import { ContactDetailsView } from '../../../../../components';

export default async function ContactDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContactDetailsView id={id} />;
}
