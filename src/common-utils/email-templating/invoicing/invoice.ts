import moment from 'moment'

import { CurrencyCode } from '@wirebill/shared-common/enums'

import { formatToCurrency } from '../../format-to-currency'

import * as invoiceItemToHtml from './invoiceItem'

const html = ` 
  <table id="InvoiceDetails" style="white-space:nowrap;">
    <tbody>
      <tr>
        <td style="padding: 5px;">
          <h4>Outgoing Invoice</h4>
          <div>
            <table style="white-space:nowrap;">
              <tbody>
                <tr><td style="padding: 5px;">Invoice Number</td><td style="padding: 5px;">{{invoiceId}}</td></tr>
                <tr><td style="padding: 5px;">Date of issue</td><td style="padding: 5px;">{{invoiceCreatedAt}}</td></tr>
                <tr><td style="padding: 5px;">Date due</td><td style="padding: 5px;">{{invoiceDueDate}}</td></tr>
              </tbody>
            </table>
          </div>
        </td>
        <td class="logoCell" style="vertical-align: baseline; text-align: right;padding: 5px;">
          <img
            src="data:image/png;base64,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"
            alt="Wirebill" style="width: 40%;">
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 5px;">
          <div>
            <table id="BillingInfo" style="white-space:nowrap;">
              <tbody>
                <tr><td style="padding: 5px;">From</td><td>Bill to</td></tr>
                <tr><td style="padding: 5px;"><h4>{{invoiceCreatorEmail}}</h4></td><td><h4>{{invoiceRefererEmail}}</h4></td></tr>
                <tr><td style="padding: 5px;" colspan="2">
                  <h3 style="margin-bottom: 5px;">{{invoiceTotal}}<small>&nbsp;{{invoiceDueDate}}</small></h3>
                  <a href="{{toPayOnlineInvoiceLink}}">Pay online</a>
                </td></tr>
              </tbody>
            </table>
          </div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 5px;">
          <div>
            <table id="InvoiceItems" style="width: 100%;white-space:nowrap;">
              <thead>
                <tr>
                  <th scope="col" style="border-bottom: 2px solid black; padding: 5px; text-align: left;">DESCRIPTION</th>
                  <th scope="col" style="border-bottom: 2px solid black; padding: 5px; text-align: right;">AMOUNT</th>
                  <th scope="col" style="border-bottom: 2px solid black; padding: 5px; text-align: right;">TAX (%)</th>
                  <th scope="col" style="border-bottom: 2px solid black; padding: 5px; text-align: right;">SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                {{invoiceItemsHtml}} 
              </tbody>
            </table>
          </div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 5px;">
          <div style="margin-top: 40px; width: 45%; margin-left: auto;">
            <table id="InvoiceSummary" style="width:100%;white-space:nowrap;">
              <tbody>
                <tr><td style="padding: 5px;text-align: left;">Subtotal</td><td   style="padding: 5px;text-align: right;" >{{invoiceSubtotal}}</td></tr>
                <tr><td style="padding: 5px;text-align: left;">Total</td><td      style="padding: 5px;text-align: right;" >{{invoiceTotal}}</td></tr>
                <tr><td style="padding: 5px;text-align: left;">Amount Due</td><td style="padding: 5px;text-align: right;" >{{invoiceTotal}}</td></tr>
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </tbody>
  </table>   
`

const RegExpToKeyMapping = {
  InvoiceId: new RegExp(`{{invoiceId}}`, `gi`),
  InvoiceCreatedAt: new RegExp(`{{invoiceCreatedAt}}`, `gi`),
  InvoiceCreatorEmail: new RegExp(`{{invoiceCreatorEmail}}`, `gi`),
  InvoiceRefererEmail: new RegExp(`{{invoiceRefererEmail}}`, `gi`),
  InvoiceTotal: new RegExp(`{{invoiceTotal}}`, `gi`),
  InvoiceSubtotal: new RegExp(`{{invoiceSubtotal}}`, `gi`),
  InvoiceDueDate: new RegExp(`{{invoiceDueDate}}`, `gi`) /* ??? */,
  ToPayOnlineInvoiceLink: new RegExp(`{{toPayOnlineInvoiceLink}}`, `gi`) /* new */,
  InvoiceItemsHtml: new RegExp(`{{invoiceItemsHtml}}`, `gi`) /* new */,
}

export const processor = (rawInvoice: any) => {
  const invoice = rawInvoice // @IMPORTANT_NOTE: plainToInstance(CONSUMER.InvoiceResponse, rawInvoice)
  const itemsHtml = invoice.items.map(item => invoiceItemToHtml.processor(item, invoice.tax)).join(`\n`)
  const payOnlineBeLink = `http://some-link`

  return html
    .replace(RegExpToKeyMapping.InvoiceId, invoice.id)
    .replace(RegExpToKeyMapping.InvoiceCreatedAt, moment(invoice.createdAt).format(`ll`))
    .replace(RegExpToKeyMapping.InvoiceDueDate, moment(invoice.dueDateInDays).format(`ll`))
    .replace(RegExpToKeyMapping.InvoiceCreatorEmail, invoice.creator)
    .replace(RegExpToKeyMapping.InvoiceRefererEmail, invoice.referer)
    .replace(RegExpToKeyMapping.InvoiceTotal, formatToCurrency(invoice.total, CurrencyCode.USD))
    .replace(RegExpToKeyMapping.InvoiceSubtotal, formatToCurrency(invoice.subtotal, CurrencyCode.USD))
    .replace(RegExpToKeyMapping.ToPayOnlineInvoiceLink, payOnlineBeLink)
    .replace(RegExpToKeyMapping.InvoiceItemsHtml, itemsHtml)
}
