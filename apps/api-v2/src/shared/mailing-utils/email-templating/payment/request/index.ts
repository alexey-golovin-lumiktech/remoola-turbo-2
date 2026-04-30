import { renderEmailLayout, renderKeyValueTable } from '../../shared/layout';
import { escapeAttr, escapeHtml } from '../../shared/sanitize';

export const processor = (params: {
  payerEmail: string;
  requesterEmail: string;
  amount: string;
  currencyCode: string;
  descriptionLine: string;
  dueDateLine: string;
  paymentRequestLink: string;
}): string => {
  const {
    payerEmail = ``,
    requesterEmail = ``,
    amount = ``,
    currencyCode = ``,
    descriptionLine = ``,
    dueDateLine = ``,
    paymentRequestLink = ``,
  } = params;

  const detailsTable = renderKeyValueTable(
    [
      { label: `From`, value: requesterEmail },
      { label: `To`, value: payerEmail },
      { label: `Amount`, value: `${amount} ${currencyCode}`.trim() },
      descriptionLine ? { label: `Description`, value: descriptionLine } : null,
      dueDateLine ? { label: `Due`, value: dueDateLine } : null,
    ].filter((row): row is { label: string; value: string } => Boolean(row)),
  );

  const bodyHtml = `
    <div>
      <strong>${escapeHtml(requesterEmail)}</strong> requested
      <strong>${escapeHtml(`${amount} ${currencyCode}`.trim())}</strong> from you.
    </div>
    ${detailsTable}
    <div style="margin-top:10px;color:#9ca3af;">
      If the button doesn’t work, use this link:
      <a href="${escapeAttr(paymentRequestLink)}" style="color:#93c5fd;text-decoration:none;">View payment request</a>
    </div>
  `.trim();

  return renderEmailLayout({
    preheader: `Payment request from ${requesterEmail}`,
    title: `Payment request`,
    lead: `Review the details and respond.`,
    bodyHtml,
    cta: { href: paymentRequestLink, label: `View payment request` },
  });
};
