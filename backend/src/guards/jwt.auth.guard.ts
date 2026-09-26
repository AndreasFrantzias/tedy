import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isPublic) {
      //if the route is not public, enforce JWT authentication
      return super.canActivate(context) as Promise<boolean>;
    }
    // Public pages still benefit from req.user when a visitor is already logged in.
    try {
      await super.canActivate(context);
    } catch {
      // no token is fine here; the request continues as a guest.
    }
    return true;
  }
}
