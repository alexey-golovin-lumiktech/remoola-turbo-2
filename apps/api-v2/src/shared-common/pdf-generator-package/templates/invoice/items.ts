/* eslint-disable max-len */
import { type InvoiceItemsItem } from '../../types';

const itemsTableTemplate = `
  <table style="width: 100%; border-collapse: collapse;margin-bottom: 40px">
    <thead style="background-color: #F3F3F3 !important;">
      <tr>
        <th style="background-color: #F3F3F3 !important;min-width: 8ch; text-transform: capitalize;padding: 10px; text-align: start;">item</th>
        <th style="background-color: #F3F3F3 !important;min-width: 8ch; text-transform: capitalize;padding: 10px; text-align: center;">charges</th>
        <th style="background-color: #F3F3F3 !important;min-width: 8ch; text-transform: capitalize;padding: 10px; text-align: center;">tax</th>
        <th style="background-color: #F3F3F3 !important;min-width: 8ch; text-transform: capitalize;padding: 10px; text-align: center;">subtotal</th>
      </tr>
    </thead>
    <tbody>{{rows}}</tbody>
  </table>`;

const itemsTableRowTemplate = `
  <tr>
    <td style="padding: 10px; font-weight: bold; width: 60%;">{{description}}</td>
    <td style="padding: 10px; text-align:center">{{charges}}</td>
    <td style="padding: 10px; text-align:center">{{tax}}</td>
    <td style="padding: 10px; text-align:center">{{subtotal}}</td>
  </tr>`;

export const getInvoiceItemsTable = (items: InvoiceItemsItem[] = []) => {
  if (items.length === 0) return ``;

  const rows = items
    .map((x) => {
      return itemsTableRowTemplate
        .replace(/{{description}}/g, x.description.toString())
        .replace(/{{charges}}/g, x.charges.toString())
        .replace(/{{tax}}/g, x.tax.toString())
        .replace(/{{subtotal}}/g, x.subtotal.toString());
    })
    .join(`\n`);

  return itemsTableTemplate.replace(/{{rows}}/g, rows);
};
