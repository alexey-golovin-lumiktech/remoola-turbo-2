import { sumBy } from 'lodash'

export const calculateInvoice = (invoiceItems: any[], tax: number) => {
  const subtotal = sumBy(invoiceItems, `amount`)
  const total = subtotal + (subtotal / 100) * tax
  return { subtotal, total }
}
