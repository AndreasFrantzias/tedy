import { SetMetadata } from '@nestjs/common';

//same logic as public decorator, but for roles
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
