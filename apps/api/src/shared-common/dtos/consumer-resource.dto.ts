import { type IConsumerResourceModel } from '../models/consumer-resource.model';
import { type OnlyUpsertFields, type WithoutDeletedAt } from '../types';

export type IConsumerResourceResponse = WithoutDeletedAt<IConsumerResourceModel>;
export type IConsumerResourceCreate = OnlyUpsertFields<WithoutDeletedAt<IConsumerResourceModel>>;
export type IConsumerResourceUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IConsumerResourceModel>>>;
