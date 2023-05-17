export const sortDirection = { asc: `asc`, desc: `desc` } as const
export const sortDirections = Object.values(sortDirection)
export type SortDirection = (typeof sortDirection)[keyof typeof sortDirection]

export const sortNulls = { NULLS_FIRST: `NULLS FIRST`, NULLS_LAST: `NULLS LAST` } as const
export const sortNullsValues = Object.values(sortNulls)
export type SortNulls = ValueOf<typeof sortNulls>

export const invoiceStatus = { paid: `paid`, due: `due`, canceled: `canceled` } as const
export const invoiceStatuses = Object.values(invoiceStatus)
export type InvoiceStatus = ValueOf<typeof invoiceStatus>

export const swaggerDocExpansion = { Full: `full`, None: `none`, List: `list` } as const
export const swaggerDocExpansionValues = Object.values(swaggerDocExpansion)
export type SwaggerDocExpansion = ValueOf<typeof swaggerDocExpansion>

export const invoiceType = { incoming: `incoming-only`, outgoing: `outgoing-only` } as const
export const invoiceTypes = Object.values(invoiceType /* eslint-disable-line */)
export type InvoiceType = (typeof invoiceType)[keyof typeof invoiceType]

export const adminType = { super: `super`, admin: `admin` } as const
export const adminTypes = Object.values(adminType)
export type AdminType = ValueOf<typeof adminType>

export const authHeader = { Bearer: `Bearer`, Basic: `Basic` } as const
export const authHeaders = Object.values(authHeader)
export type AuthHeader = ValueOf<typeof authHeader>

export const separator = { token: ` `, credentials: `:` } as const
export const separators = Object.values(separator)
export type Separator = ValueOf<typeof separator>
