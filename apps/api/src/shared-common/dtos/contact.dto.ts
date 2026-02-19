import { type IContactModel } from '../models/contact.model';
import { type OnlyUpsertFields, type WithoutDeletedAt } from '../types';

export type IContactResponse = WithoutDeletedAt<IContactModel>;
export type IContactCreate = OnlyUpsertFields<WithoutDeletedAt<IContactModel>>;
export type IContactUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IContactModel>>>;
