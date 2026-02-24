import { CURRENCY_CODE } from '@remoola/api-types';

import { formatCurrency } from '../../../../shared-common';

const html = `
  <tr>
    <td style="padding: 5px;text-align: left;">{{itemDescription}}</td>
    <td width="15%" style="padding: 5px;text-align: right;">{{itemAmount}}</td>
    <td width="15%" style="padding: 5px;text-align: right;">{{invoiceTax}}</td>
    <td width="15%" style="padding: 5px;text-align: right;">{{calculatedItemSubtotal}}</td>
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
  if (tax) calculatedItemSubtotal = item.amount + (item.amount / 100) * tax;

  return html
    .replace(ReplacementsRegExpMapping.ItemDescription, item.description)
    .replace(ReplacementsRegExpMapping.ItemAmount, formatCurrency(item.amount, CURRENCY_CODE.USD))
    .replace(
      ReplacementsRegExpMapping.CalculatedItemSubtotal,
      formatCurrency(calculatedItemSubtotal, CURRENCY_CODE.USD),
    )
    .replace(ReplacementsRegExpMapping.InvoiceTax, tax ? tax + `%` : `--`);
};
