import { type RequestMeta } from '../common';

export type AdminV2RequestMeta = Partial<RequestMeta>;
export type AdminV2RequestAuditMeta = Pick<AdminV2RequestMeta, `ipAddress` | `userAgent`>;

export type AdminV2ActorContext = {
  id: string;
  email?: string;
  type: string;
};
