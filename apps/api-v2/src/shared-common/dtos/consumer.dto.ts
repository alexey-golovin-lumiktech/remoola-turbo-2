import { type IConsumerModel } from '../models/consumer.model';
import { type OnlyUpsertFields, type WithoutDeletedAt } from '../types';

export type IConsumerCreate = OnlyUpsertFields<WithoutDeletedAt<IConsumerModel>>;
export type IConsumerUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IConsumerModel>>>;
