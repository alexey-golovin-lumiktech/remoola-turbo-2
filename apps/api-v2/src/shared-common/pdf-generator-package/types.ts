export type Invoice = { number: string; date: string | Date; info: InvoiceInfo; items: InvoiceItemsItem[] };
type InvoiceInfoDetails = { name: string; address: string; line1: string; line2: string };
type InvoiceInfo = { from: InvoiceInfoDetails; to: InvoiceInfoDetails; bankingInfo?: string };
type InvoiceItemsItem = { description: string; charges: number; tax: number; subtotal: number };
export type GeneratePdfParams = { webUrl?: string; rawHtml?: string };
