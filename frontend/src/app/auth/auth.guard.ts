import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })

//auth guard to protect routes that require authentication
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  //canActivate method checks if the user is logged in, if not redirects to login page
  canActivate(): boolean | UrlTree {
    return this.authService.isLoggedIn()
      ? true
      : this.router.createUrlTree(['/login']);
  }
}
