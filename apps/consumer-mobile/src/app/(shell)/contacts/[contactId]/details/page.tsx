import { headers } from 'next/headers';

import { contactParamsSchema, getContactDetailsFull, ContactDetailView } from '../../../../../features/contacts';

interface ContactDetailPageProps {
  params: Promise<{ contactId: string }>;
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const parsed = contactParamsSchema.safeParse(await params);
  if (!parsed.success) return <div className="text-sm text-slate-600">Invalid contact id.</div>;
  const { contactId } = parsed.data;
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const contactDetails = await getContactDetailsFull(contactId, cookie);
  return <ContactDetailView contactDetails={contactDetails} contactId={contactId} />;
}
