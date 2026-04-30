import { renderEmailLayout, renderFallbackLinkLine, renderKeyValueTable } from '../../shared/layout';
import { escapeHtml } from '../../shared/sanitize';

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
    ${renderFallbackLinkLine({ href: paymentRequestLink, label: `View payment request` })}
  `.trim();

  return renderEmailLayout({
    preheader: `Payment request from ${requesterEmail}`,
    title: `Payment request`,
    lead: `Review the details and respond.`,
    bodyHtml,
    cta: { href: paymentRequestLink, label: `View payment request` },
  });
};
