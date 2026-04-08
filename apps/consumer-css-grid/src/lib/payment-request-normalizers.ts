import { type getContacts, type getExchangeCurrencies } from './consumer-api.server';

export function normalizePaymentRequestContacts(
  contacts: Awaited<ReturnType<typeof getContacts>>,
): Array<{ id: string; email: string; name?: string }> {
  return (contacts?.items ?? [])
    .map((contact) => {
      const email = contact.email?.trim().toLowerCase();
      if (!email) return null;
      return {
        id: contact.id,
        email,
        ...(contact.name?.trim() ? { name: contact.name.trim() } : {}),
      };
    })
    .filter((contact): contact is { id: string; email: string; name?: string } => contact !== null);
}

export function normalizePaymentRequestCurrencies(
  currencies: Awaited<ReturnType<typeof getExchangeCurrencies>>,
): string[] {
  return Array.from(
    new Set(
      (currencies ?? [])
        .map((currency) => currency.code.trim().toUpperCase())
        .filter((currency) => currency.length === 3),
    ),
  );
}
