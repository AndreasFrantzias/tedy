import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Router } from '@angular/router';
import {
  catchError,
  Observable,
  throwError
} from 'rxjs';
import { AuthService } from './auth.service';

//interceptor to add JWT token to outgoing HTTP requests and handle 401 errors
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {
  }

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const authReq = this.addToken(req);
    return next.handle(authReq).pipe(
      catchError(error => this.handleError(error))
    );
  }

  //adds jwt token to the request headers (if the user is logged in)
  private addToken(
    req: HttpRequest<unknown>
  ): HttpRequest<unknown> {
    const token = this.authService.accessToken();
    if (!token) {
      return req;
    }
    //clone request and add Authorization header with Bearer token
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 401) {
      //if error is 401 ,log out user and redirect to login page
      this.authService.logout();
      this.router.navigate(['/login']);
    }
    return throwError(() => error);
  }
}
