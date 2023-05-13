import { BaseModel, IBaseModel } from './base'

export interface IAddressModel extends IBaseModel {
  billingDetailsId: string
  consumerId: string

  city?: string /* City, district, suburb, town, or village. */
  country?: string /*  Two-letter country code ([ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)). */
  line1?: string /* Address line 1 (e.g., street, PO Box, or company name).  (JP Block or building number.)*/
  line2?: string /* Address line 2 (e.g., apartment, suite, unit, or building). (JP  Building details)*/
  postalCode?: string /* ZIP or postal code. */
  state?: string /* State, county, province, or region. Prefecture*/
}

export class AddressModel extends BaseModel implements IAddressModel {
  billingDetailsId: string
  consumerId: string

  city?: string
  country?: string
  line1?: string
  line2?: string
  postalCode?: string
  state?: string
}
