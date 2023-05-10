import { stripeEvent } from '../../constants'

export type StripeEvent = typeof stripeEvent
export type StripeEventKey = keyof StripeEvent
export type StripeEventValue = StripeEvent[StripeEventKey]

export const paymentMethodType = { card: `card` } as const
export type PaymentMethodType = typeof paymentMethodType
export type PaymentMethodTypeKey = keyof PaymentMethodType
export type PaymentMethodTypeValue = PaymentMethodType[PaymentMethodTypeKey]
