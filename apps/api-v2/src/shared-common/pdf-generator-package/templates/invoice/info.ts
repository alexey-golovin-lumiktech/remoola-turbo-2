/* eslint-disable max-len */
import { detailsSampleKeys } from '../../constants';
import { type InvoiceInfo } from '../../types';

const infoTableTemplate = `
  <table style="width: 100%; border-collapse: collapse;margin-bottom: 40px;">
    <thead>
      <tr>
        <th style="text-transform: capitalize; text-align: start; padding: 10px; color: #8C8A9B !important; print-color-adjust: exact; --webkit-print-color-adjust: exact;">From:</th>
        <th style="text-transform: capitalize; text-align: start; padding: 10px; color: #8C8A9B !important; print-color-adjust: exact; --webkit-print-color-adjust: exact;">To:</th>
      </tr>
    </thead>
    <tbody>{{rows}}{{bankingRow}}</tbody>
  </table>`;

const infoTableRowTemplate = `
  <tr>
    <td style="padding: 10px">{{fromData}}</td>
    <td style="padding: 10px">{{toData}}</td>
  </tr>`;

const infoTableBankingRowTemplate = `
  <tr>
    <td style="padding: 10px" colspan="2">{{bankingInfo}}</td>
  </tr>`;

export const getInvoiceInfoTable = (info: InvoiceInfo) => {
  const rows = detailsSampleKeys
    .map((key) => {
      const fromData = info.from?.[key];
      const toData = info.to?.[key];

      return infoTableRowTemplate
        .replace(/{{fromData}}/g, fromData.toString())
        .replace(/{{toData}}/g, toData.toString());
    })
    .join(`\n`);

  const bankingRow = infoTableBankingRowTemplate.replace(/{{bankingInfo}}/g, (info.bankingInfo ?? ``).toString());

  return infoTableTemplate.replace(/{{rows}}/g, rows).replace(/{{bankingRow}}/g, bankingRow);
};
