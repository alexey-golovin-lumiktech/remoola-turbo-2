import type { IResourceModel } from '../models/resource.model';
import type { OnlyUpsertFields, WithoutDeletedAt } from '../types';

export type IResourceResponse = WithoutDeletedAt<IResourceModel>;
export type IResourceCreate = OnlyUpsertFields<WithoutDeletedAt<IResourceModel>>;
export type IResourceUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IResourceModel>>>;
