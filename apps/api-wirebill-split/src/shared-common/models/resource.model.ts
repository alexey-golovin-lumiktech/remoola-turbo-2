import { type $Enums } from '@remoola/database';

import type { IBaseModel } from './base.model';

export type IResourceModel = {
  access?: $Enums.ResourceAccess;
  originalname: string;
  mimetype: string;
  size: number;
  bucket: string;
  key: string;
  downloadUrl: string;
} & IBaseModel;
