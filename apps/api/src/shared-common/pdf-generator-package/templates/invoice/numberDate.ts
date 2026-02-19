import { type Invoice } from '../../types';

const numberDateTemplate = `
  <table style="width: unset; margin-bottom: 40px">
    <tbody>
      <tr>
        <td style="padding: 10px;">Invoice No</td>
        <td style="padding: 10px;font-weight: bold">{{invoiceNumber}}</td>
      </tr>
      <tr>
        <td style="padding: 10px;">Invoice Date</td>
        <td style="padding: 10px;font-weight: bold">{{invoiceDate}}</td>
      </tr>
    </tbody>
  </table>`;

export const getInvoiceNumberDateTable = (invoice: Invoice) => {
  return numberDateTemplate
    .replace(/{{invoiceNumber}}/g, invoice.number.toString())
    .replace(/{{invoiceDate}}/g, invoice.date.toString());
};
