import { type IAdminModel } from '../models/admin.model';
import { type OnlyUpsertFields, type WithoutDeletedAt } from '../types';

export type IAdminResponse = WithoutDeletedAt<IAdminModel>;
export type IAdminCreate = OnlyUpsertFields<WithoutDeletedAt<IAdminModel>>;
export type IAdminUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IAdminModel>>>;
