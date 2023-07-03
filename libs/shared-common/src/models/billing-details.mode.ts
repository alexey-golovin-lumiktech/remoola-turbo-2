import { IBaseModel } from './base.model'

export interface IBillingDetailsModel extends IBaseModel {
  consumerId: string

  email?: string
  name?: string
  phone?: string

  // address
  city?: string /* City, district, suburb, town, or village. */
  country?: string /*  Two-letter country code ([ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)). */
  line1?: string /* Address line 1 (e.g., street, PO Box, or company name).  (JP Block or building number.)*/
  line2?: string /* Address line 2 (e.g., apartment, suite, unit, or building). (JP  Building details)*/
  postalCode?: string /* ZIP or postal code. */
  state?: string /* State, county, province, or region. Prefecture*/
}
