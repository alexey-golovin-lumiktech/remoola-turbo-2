export type Invoice = { number: string; date: string | Date; info: InvoiceInfo; items: InvoiceItemsItem[] };
export type InvoiceInfoDetails = { name: string; address: string; line1: string; line2: string };
export type InvoiceInfoDetailsKey = keyof InvoiceInfoDetails;
export type InvoiceInfo = { from: InvoiceInfoDetails; to: InvoiceInfoDetails; bankingInfo?: string };
export type InvoiceItemsItem = { description: string; charges: number; tax: number; subtotal: number };
export type GeneratePdfParams = { webUrl?: string; rawHtml?: string };
