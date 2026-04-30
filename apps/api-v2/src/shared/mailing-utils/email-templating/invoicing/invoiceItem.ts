import { CURRENCY_CODE } from '@remoola/api-types';

import { formatCurrency } from '../../../../shared-common';
import { escapeHtml } from '../shared/sanitize';

const html = `
  <tr>
    <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;">
      <div style="font-size:15px;line-height:22px;font-weight:700;color:#111827;">
        {{itemDescription}}
      </div>
      <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="width:100%;margin-top:8px;border-collapse:collapse;"
      >
        <tbody>
          <tr>
            <td style="padding:3px 0;color:#475569;font-size:13px;line-height:18px;">Amount</td>
            <td
              style="
                padding:3px 0;
                color:#111827;
                font-size:13px;
                line-height:18px;
                text-align:right;
                white-space:nowrap;
              "
            >
              {{itemAmount}}
            </td>
          </tr>
          <tr>
            <td style="padding:3px 0;color:#475569;font-size:13px;line-height:18px;">Tax</td>
            <td
              style="
                padding:3px 0;
                color:#111827;
                font-size:13px;
                line-height:18px;
                text-align:right;
                white-space:nowrap;
              "
            >
              {{invoiceTax}}
            </td>
          </tr>
          <tr>
            <td style="padding:3px 0;color:#475569;font-size:13px;line-height:18px;">Subtotal</td>
            <td
              style="
                padding:3px 0;
                color:#111827;
                font-size:13px;
                line-height:18px;
                text-align:right;
                white-space:nowrap;
                font-weight:700;
              "
            >
              {{calculatedItemSubtotal}}
            </td>
          </tr>
        </tbody>
      </table>
    </td>
  </tr>
`;

const ReplacementsRegExpMapping = {
  ItemDescription: new RegExp(`{{itemDescription}}`, `gi`),
  ItemAmount: new RegExp(`{{itemAmount}}`, `gi`),
  CalculatedItemSubtotal: new RegExp(`{{calculatedItemSubtotal}}`, `gi`),
  InvoiceTax: new RegExp(`{{invoiceTax}}`, `gi`),
};

export const processor = (item: { description: string; amount: number }, tax?: number) => {
  let calculatedItemSubtotal = item.amount;
  const hasTax = typeof tax === `number`;
  if (hasTax) calculatedItemSubtotal = item.amount + (item.amount / 100) * tax;

  return html
    .replace(ReplacementsRegExpMapping.ItemDescription, escapeHtml(item.description))
    .replace(ReplacementsRegExpMapping.ItemAmount, formatCurrency(item.amount, CURRENCY_CODE.USD))
    .replace(
      ReplacementsRegExpMapping.CalculatedItemSubtotal,
      formatCurrency(calculatedItemSubtotal, CURRENCY_CODE.USD),
    )
    .replace(ReplacementsRegExpMapping.InvoiceTax, hasTax ? tax + `%` : `--`);
};
