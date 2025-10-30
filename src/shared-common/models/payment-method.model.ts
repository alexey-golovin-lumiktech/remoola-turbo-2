/* eslint-disable simple-import-sort/imports */
import type { PaymentMethodType } from '../enums'
import type { PaymentMethodTypeValue, CreditCardExpMonth, CreditCardExpYear } from '../types'
import type { IBaseModel } from './base.model'

export type IPaymentMethodCommon = {
  consumerId: string
  brand: string
  last4: string
  defaultSelected: boolean

  billingDetailsId?: string
  serviceFee?: number
} & IBaseModel //eslint-disable-line

export type IPaymentMethodBankAccountModel = {
  type: typeof PaymentMethodType.BankAccount
} & IPaymentMethodCommon

export type IPaymentMethodCreditCardModel = {
  type: typeof PaymentMethodType.CreditCard
  expMonth: CreditCardExpMonth
  expYear: CreditCardExpYear
} & IPaymentMethodCommon

export type IPaymentMethodModel = {
  consumerId: string
  type: PaymentMethodTypeValue
  brand: string
  last4: string
  defaultSelected: boolean

  billingDetailsId?: string
  serviceFee?: number
  expMonth?: CreditCardExpMonth
  expYear?: CreditCardExpYear
} & IBaseModel

export type IPaymentMethodModelType = IPaymentMethodCreditCardModel | IPaymentMethodBankAccountModel
