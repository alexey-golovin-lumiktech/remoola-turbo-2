type ContactLike = { email: string };

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function hasContactForEmail(contacts: ContactLike[], email: string): boolean {
  const normalized = normalizeEmail(email);
  return contacts.some((contact) => normalizeEmail(contact.email) === normalized);
}

export function isContactAlreadyExists(status: number, message: string): boolean {
  return status === 409 || message.toLowerCase().includes(`already exists`);
}

type ContactCreateResult = { ok: boolean; status: number; message: string };

type UnknownRecipientDecisionParams = {
  addToContacts: boolean;
  createContactAction: () => Promise<ContactCreateResult>;
  createPaymentRequestAction: () => Promise<void>;
};

export async function continueWithUnknownRecipient(params: UnknownRecipientDecisionParams): Promise<void> {
  if (params.addToContacts) {
    const createContactResult = await params.createContactAction();
    if (!createContactResult.ok && !isContactAlreadyExists(createContactResult.status, createContactResult.message)) {
      throw new Error(createContactResult.message || `Failed to add contact`);
    }
  }

  await params.createPaymentRequestAction();
}
