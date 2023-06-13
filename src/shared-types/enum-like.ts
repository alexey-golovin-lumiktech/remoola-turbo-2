export const sortDirection = { asc: `asc`, desc: `desc` } as const
export const sortDirectionVariants = Object.values(sortDirection)
export type SortDirection = (typeof sortDirection)[keyof typeof sortDirection]

export const sortNulls = { NULLS_FIRST: `NULLS FIRST`, NULLS_LAST: `NULLS LAST` } as const
export const sortNullsVariants = Object.values(sortNulls)
export type SortNulls = (typeof sortNulls)[keyof typeof sortNulls]

export const invoiceStatus = { draft: `draft`, open: `open`, paid: `paid`, uncollectible: `uncollectible`, void: `void` } as const //like stripe
export const invoiceStatusVariants = Object.values(invoiceStatus)
export type InvoiceStatus = (typeof invoiceStatus)[keyof typeof invoiceStatus]

export const invoiceType = { incoming: `incoming-only`, outgoing: `outgoing-only` } as const
export const invoiceTypeVariants = Object.values(invoiceType /* eslint-disable-line */)
export type InvoiceType = (typeof invoiceType)[keyof typeof invoiceType]

export const adminType = { super: `super`, admin: `admin` } as const
export const adminTypeVariants = Object.values(adminType)
export type AdminType = (typeof adminType)[keyof typeof adminType]

export const authHeader = { Bearer: `Bearer`, Basic: `Basic` } as const
export const authHeaderVariants = Object.values(authHeader)
export type AuthHeader = (typeof authHeader)[keyof typeof authHeader]

export const separator = { token: ` `, credentials: `:` } as const
export const separatorVariants = Object.values(separator)
export type Separator = (typeof separator)[keyof typeof separator]

export const currencyCode = { USD: `USD` } as const
export const currencyCodeVariants = Object.values(currencyCode)
export type CurrencyCode = (typeof currencyCode)[keyof typeof currencyCode]

export const accountType = { business: `business`, contractor: `contractor` } as const
export const accountTypeVariants = Object.values(accountType)
export type AccountType = (typeof accountType)[keyof typeof accountType]

export const contractorKind = { entity: `entity`, individual: `individual` } as const
export const contractorKindVariants = Object.values(contractorKind)
export type ContractorKind = (typeof contractorKind)[keyof typeof contractorKind]

export const howDidHearAboutUs = { google: `google`, facebook: `facebook`, internet: `internet` }
export const howDidHearAboutUsVariants = Object.values(howDidHearAboutUs)
export type HowDidHearAboutUs = (typeof howDidHearAboutUs)[keyof typeof howDidHearAboutUs]

export const organizationSize = { small: `1-10`, medium: `11-100`, large: `101-500` } as const
export const organizationSizeVariants = Object.values(organizationSize)
export type OrganizationSize = (typeof organizationSize)[keyof typeof organizationSize]

export const consumerRoleInOrganization = { manager: `manager`, worker: `worker`, owner: `owner`, other: `other` } as const
export const consumerRoleInOrganizationVariants = Object.values(consumerRoleInOrganization)
export type ConsumerRoleInOrganization = (typeof consumerRoleInOrganization)[keyof typeof consumerRoleInOrganization]
