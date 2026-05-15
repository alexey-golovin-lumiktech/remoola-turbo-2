import { type IPaymentMethodModel } from '../models/payment-method.model';
import { type WithoutDeletedAt } from '../types';

export type IPaymentMethodResponse = WithoutDeletedAt<IPaymentMethodModel>;
