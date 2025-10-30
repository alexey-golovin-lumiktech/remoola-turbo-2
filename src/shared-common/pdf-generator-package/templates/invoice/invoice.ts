/* eslint-disable simple-import-sort/imports */
import type { Invoice } from '../../types'
import { getInvoiceInfoTable } from './info'
import { getInvoiceNumberDateTable } from './numberDate'
import { getInvoiceItemsTable } from './items'
import { getInvoiceSummaryTable } from './summary'

const invoicePdfTemplate = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>INVOICE_{{invoiceNumber}}</title>
    <style>@media print {*{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;}}</style>
  </head>
  <body style="margin: 0;">
    <div class="content" style="height: 100%">
      <table style="width: 100%; border-collapse: collapse">
        <caption style="caption-side:top;padding-bottom: 80px">INVOICE <b>{{invoiceNumber}}</b></caption>
        <tbody>
          <tr><td>{{infoTable}}</td></tr>
          <tr><td>{{dateNumberTable}}</td></tr>
          <tr><td>{{itemsTable}}</td></tr>
          <tr>
            <td>
              <table style="width: 100%; border-collapse: collapse;margin-bottom: 40px">
                <tbody><tr><td style="width: 60%"></td><td>{{summaryTable}}</td></tr></tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>
</html>`

export const getInvoiceHtml = (invoice: Invoice): string => {
  const infoTable = getInvoiceInfoTable(invoice.info)
  const dateNumberTable = getInvoiceNumberDateTable(invoice)
  const itemsTable = getInvoiceItemsTable(invoice.items)
  const summaryTable = getInvoiceSummaryTable(invoice.items)

  return invoicePdfTemplate
    .replace(/{{infoTable}}/g, infoTable.toString())
    .replace(/{{dateNumberTable}}/g, dateNumberTable.toString())
    .replace(/{{itemsTable}}/g, itemsTable.toString())
    .replace(/{{summaryTable}}/g, summaryTable.toString())
    .replace(/{{invoiceNumber}}/g, invoice.number)
}
