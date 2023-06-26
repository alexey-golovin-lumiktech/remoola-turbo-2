import { CurrencyCode } from '../../../shared-types'
import { currencyFormatters } from '../..'

const html = `
  <tr>
    <td style="padding: 5px;text-align: left;">{{itemDescription}}</td>
    <td width="15%" style="padding: 5px;text-align: right;">{{itemAmount}}</td>
    <td width="15%" style="padding: 5px;text-align: right;">{{invoiceTax}}</td>
    <td width="15%" style="padding: 5px;text-align: right;">{{calculatedItemSubtotal}}</td>
  </tr>
`

const RegExpToKeyMapping = {
  ItemDescription: new RegExp(`{{itemDescription}}`, `gi`),
  ItemAmount: new RegExp(`{{itemAmount}}`, `gi`),
  CalculatedItemSubtotal: new RegExp(`{{calculatedItemSubtotal}}`, `gi`),
  InvoiceTax: new RegExp(`{{invoiceTax}}`, `gi`),
}

export const processor = (item: any, tax?: number) => {
  const formatter = currencyFormatters[CurrencyCode.USD]
  let calculatedItemSubtotal = item.amount
  if (tax) calculatedItemSubtotal = item.amount + (item.amount / 100) * tax

  return html
    .replace(RegExpToKeyMapping.ItemDescription, item.description)
    .replace(RegExpToKeyMapping.ItemAmount, formatter.format(item.amount))
    .replace(RegExpToKeyMapping.CalculatedItemSubtotal, formatter.format(calculatedItemSubtotal))
    .replace(RegExpToKeyMapping.InvoiceTax, tax ? tax + `%` : `--`)
}
