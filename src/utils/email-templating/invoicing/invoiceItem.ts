import { currencyCode } from '../../../shared-types'
import { currencyFormatters } from '../..'

const html = `
  <tr>
    <td style="padding: 5px;text-align: left;">{{itemDescription}}</td>
    <td width="15%" style="padding: 5px;text-align: right;">{{itemAmount}}</td>
    <td width="15%" style="padding: 5px;text-align: right;">{{invoiceTax}}</td>
    <td width="15%" style="padding: 5px;text-align: right;">{{calculatedItemSubtotal}}</td>
  </tr>
` as const

const mapping = {
  itemDescription: new RegExp(`{{itemDescription}}`, `gi`),
  itemAmount: new RegExp(`{{itemAmount}}`, `gi`),
  calculatedItemSubtotal: new RegExp(`{{calculatedItemSubtotal}}`, `gi`),
  invoiceTax: new RegExp(`{{invoiceTax}}`, `gi`),
} as const

export const processor = (item: any, tax?: number) => {
  const formatter = currencyFormatters[currencyCode.USD]
  let calculatedItemSubtotal = item.amount
  if (tax) calculatedItemSubtotal = item.amount + (item.amount / 100) * tax

  return html
    .replace(mapping.itemDescription, item.description)
    .replace(mapping.itemAmount, formatter.format(item.amount))
    .replace(mapping.calculatedItemSubtotal, formatter.format(calculatedItemSubtotal))
    .replace(mapping.invoiceTax, tax ? tax + `%` : `--`)
}
