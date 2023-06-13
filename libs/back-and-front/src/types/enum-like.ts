export const sortDirection = { asc: `asc`, desc: `desc` } as const
export const sortDirections = Object.values(sortDirection)
export type SortDirection = (typeof sortDirection)[keyof typeof sortDirection]

export const sortNulls = { NULLS_FIRST: `NULLS FIRST`, NULLS_LAST: `NULLS LAST` } as const
export const sortNullsValues = Object.values(sortNulls)
export type SortNulls = (typeof sortNulls)[keyof typeof sortNulls]

export const invoiceStatus = { draft: `draft`, open: `open`, paid: `paid`, uncollectible: `uncollectible`, void: `void` } as const //like stripe
export const invoiceStatuses = Object.values(invoiceStatus)
export type InvoiceStatus = (typeof invoiceStatus)[keyof typeof invoiceStatus]

export const invoiceType = { incoming: `incoming-only`, outgoing: `outgoing-only` } as const
export const invoiceTypes = Object.values(invoiceType /* eslint-disable-line */)
export type InvoiceType = (typeof invoiceType)[keyof typeof invoiceType]

export const adminType = { super: `super`, admin: `admin` } as const
export const adminTypes = Object.values(adminType)
export type AdminType = (typeof adminType)[keyof typeof adminType]

export const authHeader = { Bearer: `Bearer`, Basic: `Basic` } as const
export const authHeaders = Object.values(authHeader)
export type AuthHeader = (typeof authHeader)[keyof typeof authHeader]

export const separator = { token: ` `, credentials: `:` } as const
export const separators = Object.values(separator)
export type Separator = (typeof separator)[keyof typeof separator]
