import { renderEmailLayout, renderFallbackLinkLine, renderKeyValueTable } from '../../shared/layout';
import { escapeHtml } from '../../shared/sanitize';

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
    ${renderFallbackLinkLine({ href: paymentDetailsLink, label: `View payment details` })}
  `.trim();

  return renderEmailLayout({
    preheader: `Payment received`,
    title: `Payment received`,
    lead: `View details in Wirebill.`,
    bodyHtml,
    cta: { href: paymentDetailsLink, label: `View payment details` },
  });
};
