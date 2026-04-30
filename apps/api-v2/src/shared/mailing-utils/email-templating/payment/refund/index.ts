import { renderEmailLayout, renderFallbackLinkLine, renderKeyValueTable } from '../../shared/layout';
import { escapeHtml } from '../../shared/sanitize';

export const processor = (params: {
  recipientEmail: string;
  summaryLine: string;
  amount: string;
  currencyCode: string;
  reasonLine: string;
  paymentRequestLink: string;
}): string => {
  const {
    recipientEmail = ``,
    summaryLine = ``,
    amount = ``,
    currencyCode = ``,
    reasonLine = ``,
    paymentRequestLink = ``,
  } = params;

  const amountLine = `${amount} ${currencyCode}`.trim();
  const detailsTable = renderKeyValueTable(
    [
      { label: `Recipient`, value: recipientEmail },
      amountLine ? { label: `Amount`, value: amountLine } : null,
      reasonLine ? { label: `Reason`, value: reasonLine } : null,
    ].filter((row): row is { label: string; value: string } => Boolean(row)),
  );

  const bodyHtml = `
    <div>Hello <strong>${escapeHtml(recipientEmail)}</strong>.</div>
    <div style="margin-top:10px;">${escapeHtml(summaryLine)}</div>
    ${detailsTable}
    ${renderFallbackLinkLine({ href: paymentRequestLink, label: `View payment request` })}
  `.trim();

  return renderEmailLayout({
    preheader: `Payment refund`,
    title: `Payment refund`,
    lead: `A refund was processed.`,
    bodyHtml,
    cta: { href: paymentRequestLink, label: `View payment request` },
  });
};
