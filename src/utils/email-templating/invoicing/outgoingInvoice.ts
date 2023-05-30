import { currencyCode } from '../../../constants'
import { currencyFormatters } from '../..'

const html = `
  <table style="padding: 20px;font-style: italic;background: #3f3f3f;color: cyan;border-radius: 20px;font-size:28px;">
    <tbody><tr><td>
          <div style="text-align:center; font-weight:bold;color:cyan;">New Invoice #{{invoiceId}}</div>
          <div style="text-align:center; font-weight:bold;color:cyan;">From {{invoiceCreatorEmail}}</div>
          <div style="text-align:center; font-weight:bold;color:cyan;">Amount due {{invoiceSubtotal}}</div>
          <div>&nbsp;</div>
          <div style="color:cyan;">You receive new invoice #{{invoiceId}}.<div style="color:cyan;">To&nbsp;see&nbsp;more&nbsp;details&nbsp;<a style="color:goldenrod" href="{{invoiceLink}}">Click here</a></div></div>
          <div>&nbsp;</div>
          <div style="margin-left:200px;text-align:right;color:cyan">
            If it was not you and the email came to you by mistake, just ignore it.
            <div style="color:cyan;">Best&nbsp;regards&nbsp;<a style="color:goldenrod" href="mailto:support@wirebill.com">support@wirebill.com</a>.
            </div>
          </div>
        </td></tr>
    </tbody>
  </table>
` as const

const mapping = {
  invoiceCreatorEmail: new RegExp(`{{invoiceCreatorEmail}}`, `gi`),
  invoiceId: new RegExp(`{{invoiceId}}`, `gi`),
  invoiceLink: new RegExp(`{{invoiceLink}}`, `gi`),
  invoiceSubtotal: new RegExp(`{{invoiceSubtotal}}`, `gi`),
} as const

export const processor = (invoice: any) => {
  const formatter = currencyFormatters[currencyCode.USD]

  return html
    .replace(mapping.invoiceCreatorEmail, invoice.creator)
    .replace(mapping.invoiceId, invoice.id)
    .replace(mapping.invoiceLink, invoice.link)
    .replace(mapping.invoiceSubtotal, formatter.format(invoice.subtotal))
}
