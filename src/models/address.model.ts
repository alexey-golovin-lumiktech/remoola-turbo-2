import { BaseModel, IBaseModel } from './base'

export interface IAddressModel extends IBaseModel {
  billingDetailsId: string
  consumerId: string

  city: string | null /* City, district, suburb, town, or village. */
  country: string | null /*  Two-letter country code ([ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)). */
  line1: string | null /* Address line 1 (e.g., street, PO Box, or company name).  (JP Block or building number.)*/
  line2: string | null /* Address line 2 (e.g., apartment, suite, unit, or building). (JP  Building details)*/
  postal_code: string | null /* ZIP or postal code. */
  state: string | null /* State, county, province, or region. Prefecture*/
}

export class AddressModel extends BaseModel implements IAddressModel {
  billingDetailsId: string
  consumerId: string

  city: string | null
  country: string | null
  line1: string | null
  line2: string | null
  postal_code: string | null
  state: string | null
}
