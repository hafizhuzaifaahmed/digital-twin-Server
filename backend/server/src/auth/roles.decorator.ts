import { SetMetadata } from '@nestjs/common';

export type Role = 'SUPER_ADMIN' | 'USER';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
