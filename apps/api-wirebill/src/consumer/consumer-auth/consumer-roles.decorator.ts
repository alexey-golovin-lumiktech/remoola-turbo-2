import { SetMetadata } from '@nestjs/common';

export const CONSUMER_ROLES_KEY = `roles`;
export const ConsumerRoles = (...roles: string[]) => SetMetadata(CONSUMER_ROLES_KEY, roles);
