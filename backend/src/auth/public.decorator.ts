import { SetMetadata } from '@nestjs/common';

//customize decorator to mark routes as public (without authentication)
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
