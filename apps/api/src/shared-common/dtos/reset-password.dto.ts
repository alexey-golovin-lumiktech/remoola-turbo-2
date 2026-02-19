import { type IConsumerModel } from '../models/consumer.model';
import { type IResetPasswordModel } from '../models/reset-password.model';
import { type WithoutDeletedAt } from '../types';

export type IResetPassword = WithoutDeletedAt<IResetPasswordModel>;
export type IChangePasswordBody = Partial<Pick<IConsumerModel, `email` | `password`>>;
export type IChangePasswordParam = Required<{ token: string }>;
