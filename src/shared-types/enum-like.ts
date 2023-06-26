export const SortDirection = { Asc: `asc`, Desc: `desc` } as const
export const sortDirectionValues = Object.values(SortDirection)
export type SortDirectionValue = (typeof SortDirection)[keyof typeof SortDirection]

export const SortNulls = { NullsFirst: `NULLS FIRST`, NullsLast: `NULLS LAST` } as const
export const sortNullsValues = Object.values(SortNulls)
export type SortNullsValue = (typeof SortNulls)[keyof typeof SortNulls]

export const InvoiceStatus = { Draft: `draft`, Open: `open`, Paid: `paid`, Uncollectible: `uncollectible`, Void: `void` } as const
export const invoiceStatusValues = Object.values(InvoiceStatus)
export type InvoiceStatusValue = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]

export const InvoiceType = { Incoming: `incoming-only`, Outgoing: `outgoing-only` } as const
export const invoiceTypeValues = Object.values(InvoiceType)
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

export const CurrencyCode = { USD: `USD` } as const
export const currencyCodeValues = Object.values(CurrencyCode)
export type CurrencyCodeValue = (typeof CurrencyCode)[keyof typeof CurrencyCode]

export const AccountType = { Business: `business`, Contractor: `contractor` } as const
export const accountTypeValues = Object.values(AccountType)
export type AccountTypeValue = (typeof AccountType)[keyof typeof AccountType]

export const ContractorKind = { Entity: `entity`, Individual: `individual` } as const
export const contractorKindValues = Object.values(ContractorKind)
export type ContractorKindValue = (typeof ContractorKind)[keyof typeof ContractorKind]

export const HowDidHearAboutUs = { Google: `google`, Facebook: `facebook`, Internet: `internet` } as const
export const howDidHearAboutUsValues = Object.values(HowDidHearAboutUs)
export type HowDidHearAboutUsValue = (typeof HowDidHearAboutUs)[keyof typeof HowDidHearAboutUs]

export const OrganizationSize = { Small: `1-10`, Medium: `11-100`, Large: `101-500` } as const
export const organizationSizeValues = Object.values(OrganizationSize)
export type OrganizationSizeValue = (typeof OrganizationSize)[keyof typeof OrganizationSize]

export const ConsumerRole = { Manager: `manager`, Worker: `worker`, Owner: `owner`, Other: `other` } as const
export const consumerRoleValues = Object.values(ConsumerRole)
export type ConsumerRoleValue = (typeof ConsumerRole)[keyof typeof ConsumerRole]
