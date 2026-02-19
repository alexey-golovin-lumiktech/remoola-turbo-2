/* eslint-disable max-len */
import { type InvoiceItemsItem } from '../../types';

const summaryTableTemplate = `
  <table style="width: 100%; border-collapse: collapse;">
    <thead style="background-color: #F3F3F3 !important">
      <tr><th colspan="2" style="text-transform: capitalize;padding: 10px;background-color: #F3F3F3 !important">invoice summary</th></tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 10px; font-weight: bold">Subtotal</td>
        <td style="padding: 10px">{{subtotal}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; font-weight: bold">Tax</td>
        <td style="padding: 10px">{{tax}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; font-weight: bold">Total</td>
        <td style="padding: 10px">{{total}}</td>
      </tr>
    </tbody>
  </table>`;

const calculateSummary = (items: InvoiceItemsItem[]) =>
  items.reduce(
    (acc, next) => {
      acc.subtotal = acc.subtotal + next.subtotal;
      acc.tax = acc.tax + next.tax;
      acc.total = acc.tax + acc.subtotal;
      return acc;
    },
    { subtotal: 0, tax: 0, total: 0 },
  );

export const getInvoiceSummaryTable = (invoiceItems: InvoiceItemsItem[]) => {
  const summary = calculateSummary(invoiceItems);

  return summaryTableTemplate
    .replace(/{{subtotal}}/gi, summary.subtotal.toString())
    .replace(/{{tax}}/gi, summary.tax.toString())
    .replace(/{{total}}/gi, summary.total.toString());
};
