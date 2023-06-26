export const SortDirection = { Asc: `asc`, Desc: `desc` } as const
export const sortDirectionValues = Object.values(SortDirection)
export type SortDirectionValue = (typeof SortDirection)[keyof typeof SortDirection]

export const SortNulls = { NullsFirst: `NULLS FIRST`, NullsLast: `NULLS LAST` } as const
export const sortNullsValues = Object.values(SortNulls)
export type SortNullsValue = (typeof SortNulls)[keyof typeof SortNulls]

export const InvoiceStatus = { Draft: `draft`, Open: `open`, Paid: `paid`, Uncollectible: `uncollectible`, Void: `void` } as const //like stripe
export const invoiceStatusValues = Object.values(InvoiceStatus)
export type InvoiceStatusValue = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]

export const InvoiceType = { Incoming: `incoming-only`, Outgoing: `outgoing-only` } as const
export const invoiceTypeValues = Object.values(InvoiceType /* eslint-disable-line */)
export type InvoiceTypeValue = (typeof InvoiceType)[keyof typeof InvoiceType]

export const AdminType = { Super: `super`, Admin: `admin` } as const
export const adminTypeValues = Object.values(AdminType)
export type AdminTypeValue = (typeof AdminType)[keyof typeof AdminType]

export const AuthHeader = { Bearer: `Bearer`, Basic: `Basic` } as const
export const authHeaderValues = Object.values(AuthHeader)
export type AuthHeaderValue = (typeof AuthHeader)[keyof typeof AuthHeader]

export const Separator = { Token: ` `, Credentials: `:` } as const
export const separatorValues = Object.values(Separator)
export type SeparatorValue = (typeof Separator)[keyof typeof Separator]
