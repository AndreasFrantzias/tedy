import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree} from '@angular/router';
import { AuthService } from './auth.service';

//singleton service 
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  //check if user has required roles to access a route, if not redirect to forbidden page
  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const requiredRoles =
      route.data['roles'] as string[] | undefined;
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const allowed = requiredRoles.some(role =>
      this.authService.hasRole(role)
    );
    return allowed
      ? true
      : this.router.createUrlTree(['/forbidden']);
  }
}
