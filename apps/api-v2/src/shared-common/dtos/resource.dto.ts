import { type IResourceModel } from '../models/resource.model';
import { type WithoutDeletedAt } from '../types';

export type IResourceResponse = WithoutDeletedAt<IResourceModel>;
