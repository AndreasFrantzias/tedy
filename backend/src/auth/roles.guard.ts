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

  // Έλεγχος ότι ο χρήστης έχει τουλάχιστον έναν από τους απαιτούμενους ρόλους
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true; // Αν δεν υπάρχουν ρόλοι, επιτρέπεται η πρόσβαση
    }
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const roles = request.user?.roles ?? [];
    return requiredRoles.some((role) => roles.includes(role));
  }
}
