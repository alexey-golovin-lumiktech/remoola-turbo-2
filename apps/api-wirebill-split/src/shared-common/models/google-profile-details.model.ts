import type { IBaseModel } from './base.model';

export type IGoogleProfileDetailsModel = {
  emailVerified: boolean;
  email: string;

  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  organization?: string;
  metadata?: string;
} & IBaseModel;
