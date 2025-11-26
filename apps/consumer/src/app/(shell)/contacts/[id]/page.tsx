import ContactDetailsView from '../../../../components/contacts/ContactDetailsView';
import { getContactDetails } from '../../../../lib/contacts';

export default async function ContactDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const details = await getContactDetails(id);

  return <ContactDetailsView details={details} />;
}
