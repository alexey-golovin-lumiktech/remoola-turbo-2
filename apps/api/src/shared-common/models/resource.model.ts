import { type $Enums } from '@remoola/database-2';

import { type IBaseModel } from './base.model';

export type IResourceModel = {
  access?: $Enums.ResourceAccess;
  originalName: string;
  mimetype: string;
  size: number;
  bucket: string;
  key: string;
  downloadUrl: string;
} & IBaseModel;
