import { SetMetadata } from '@nestjs/common';

export const ADMIN_TYPE_METADATA_KEY = Symbol(`ADMIN_TYPE_METADATA_KEY`);
export const AdminType = (...types: string[]) => SetMetadata(ADMIN_TYPE_METADATA_KEY, types);
