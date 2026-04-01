import { getContactDetails } from '../../../../../lib/consumer-api.server';
import { UsersIcon } from '../../../../../shared/ui/icons/UsersIcon';
import { PageHeader } from '../../../../../shared/ui/shell-primitives';
import { ContactDetailView } from '../../ContactDetailView';

export default async function ContactDetailsPage({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId: rawContactId } = await params;
  const contactId = rawContactId?.trim() ?? ``;
  const contact = contactId ? await getContactDetails(contactId) : null;

  return (
    <div>
      <PageHeader title="Contact details" icon={<UsersIcon className="h-10 w-10 text-white" />} />
      <ContactDetailView contact={contact} contactId={contactId} />
    </div>
  );
}
