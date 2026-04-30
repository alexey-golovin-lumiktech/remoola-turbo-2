import { renderEmailLayout, renderKeyValueTable } from '../../shared/layout';
import { escapeAttr, escapeHtml } from '../../shared/sanitize';

export const processor = (params: { contactEmail: string; payerEmail: string; paymentDetailsLink: string }): string => {
  const { contactEmail = ``, payerEmail = ``, paymentDetailsLink = `` } = params;

  const detailsTable = renderKeyValueTable([
    { label: `Recipient`, value: contactEmail },
    { label: `Payer`, value: payerEmail },
  ]);

  const bodyHtml = `
    <div>Hello <strong>${escapeHtml(contactEmail)}</strong>.</div>
    <div style="margin-top:10px;">
      <strong>${escapeHtml(payerEmail)}</strong> made a payment in your name.
    </div>
    ${detailsTable}
    <div style="margin-top:10px;color:#9ca3af;">
      If the button doesn’t work, use this link:
      <a href="${escapeAttr(paymentDetailsLink)}" style="color:#93c5fd;text-decoration:none;">View payment details</a>
    </div>
  `.trim();

  return renderEmailLayout({
    preheader: `Payment received`,
    title: `Payment received`,
    lead: `View details in Wirebill.`,
    bodyHtml,
    cta: { href: paymentDetailsLink, label: `View payment details` },
  });
};
