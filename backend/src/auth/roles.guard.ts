import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';

interface RequestUser {
  roles?: string[];
}

interface RequestWithUser extends Request {
  user?: RequestUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  //check that user has at least one of the required roles
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    
    //if no roles are required, allow access
    if (!requiredRoles) {
      return true; 
    }
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const roles = request.user?.roles ?? [];
    return requiredRoles.some((role) => roles.includes(role));
  }
}
