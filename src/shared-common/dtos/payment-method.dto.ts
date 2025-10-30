/* eslint-disable simple-import-sort/imports */
import type { OnlyUpsertFields, WithoutDeletedAt } from '../types'
import type {
  IPaymentMethodModelType,
  IPaymentMethodBankAccountModel,
  IPaymentMethodCreditCardModel,
  IPaymentMethodModel,
} from '../models/payment-method.model'

export type IPaymentMethodResponse = WithoutDeletedAt<IPaymentMethodModel>
export type IPaymentMethodCreate = OnlyUpsertFields<WithoutDeletedAt<IPaymentMethodModel>>
export type IPaymentMethodUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IPaymentMethodModel>>>

export type IPaymentMethodCreditCardResponse = WithoutDeletedAt<IPaymentMethodCreditCardModel>
export type IPaymentMethodCreditCardCreate = OnlyUpsertFields<WithoutDeletedAt<IPaymentMethodCreditCardModel>>
export type IPaymentMethodCreditCardUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IPaymentMethodCreditCardModel>>>

export type IPaymentMethodBankAccountResponse = WithoutDeletedAt<IPaymentMethodBankAccountModel>
export type IPaymentMethodBankAccountCreate = OnlyUpsertFields<WithoutDeletedAt<IPaymentMethodBankAccountModel>>
export type IPaymentMethodBankAccountUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IPaymentMethodBankAccountModel>>>

export type IPaymentMethodModelTypeResponse = WithoutDeletedAt<IPaymentMethodModelType>
export type IPaymentMethodModelTypeCreate = OnlyUpsertFields<WithoutDeletedAt<IPaymentMethodModelType>>
export type IPaymentMethodModelTypeUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IPaymentMethodModelType>>>
