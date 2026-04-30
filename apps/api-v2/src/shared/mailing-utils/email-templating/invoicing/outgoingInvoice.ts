import { CURRENCY_CODE } from '@remoola/api-types';

import { type InvoiceForTemplate } from './invoice';
import { formatCurrency } from '../../../../shared-common';
import { resolveEmailApiBaseUrl } from '../../../resolve-email-api-base-url';
import { renderEmailLayout, renderKeyValueTable } from '../shared/layout';
import { escapeAttr, escapeHtml } from '../shared/sanitize';

export const processor = (invoice: InvoiceForTemplate) => {
  const backendBaseURL = resolveEmailApiBaseUrl();
  const invoiceLink = new URL(`consumer/payment-choices`, backendBaseURL);
  invoiceLink.searchParams.append(`invoiceId`, invoice.id);
  invoiceLink.searchParams.append(`refererEmail`, invoice.referer);

  const amountDue = formatCurrency(invoice.subtotal, CURRENCY_CODE.USD);
  const href = invoiceLink.toString();

  const detailsTable = renderKeyValueTable([
    { label: `Invoice`, value: invoice.id },
    { label: `From`, value: invoice.creator },
    { label: `Amount due`, value: amountDue },
  ]);

  const bodyHtml = `
    <div>Hello <strong>${escapeHtml(invoice.referer)}</strong>.</div>
    <div style="margin-top:10px;">
      You received a new invoice from <strong>${escapeHtml(invoice.creator)}</strong>.
    </div>
    ${detailsTable}
    <div style="margin-top:10px;color:#9ca3af;">
      If the button doesn’t work, use this link:
      <a href="${escapeAttr(href)}" style="color:#93c5fd;text-decoration:none;">View invoice</a>
    </div>
  `.trim();

  return renderEmailLayout({
    preheader: `Invoice ${invoice.id} • Amount due ${amountDue}`,
    title: `New invoice`,
    lead: `Invoice ${invoice.id} • Amount due ${amountDue}`,
    bodyHtml,
    cta: { href, label: `View invoice` },
  });
};
