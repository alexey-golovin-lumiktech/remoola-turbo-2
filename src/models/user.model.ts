import { IBaseModel, BaseModel } from './base'

export interface IUserModel extends IBaseModel {
  email: string
  verified: boolean
  password: string
  salt: string

  googleProfileId?: string
  firstName?: string
  lastName?: string
  middleName?: string
}

export class UserModel extends BaseModel implements IUserModel {
  email: string
  verified: boolean
  password: string
  salt: string

  googleProfileId?: string
  firstName?: string
  lastName?: string
  middleName?: string
}

export interface BillingDetails {
  address?: Address
  email?: string
  name?: string
  phone?: string
}

export interface Address {
  city?: string /* City, district, suburb, town, or village. */
  country?: string /*  Two-letter country code ([ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)). */
  line1?: string /* Address line 1 (e.g., street, PO Box, or company name).  (JP Block or building number.)*/
  line2?: string /* Address line 2 (e.g., apartment, suite, unit, or building). (JP  Building details)*/
  postal_code?: string /* ZIP or postal code. */
  state?: string /* State, county, province, or region. Prefecture*/
  town?: string /* Town or cho-me. */
}
