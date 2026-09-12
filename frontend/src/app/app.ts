import { Component } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { AuthState } from './auth/auth-state';
import { Observable, map, of, switchMap, timer } from 'rxjs';
import { Router } from '@angular/router';
import { MessagingApiService } from './messaging-api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css',
})
export class App {

  title: string = 'Hello Project 1';

  authState$: Observable<AuthState>;
  unreadCount$: Observable<number>;

  constructor(public authService: AuthService,
              private messagingApi: MessagingApiService,
              private router: Router) {
    this.authState$ = this.authService.state$;
    this.unreadCount$ = this.authState$.pipe(
      switchMap((state) =>
        state.authenticated
          ? timer(0, 30000).pipe(switchMap(() => this.messagingApi.unreadCount()))
          : of({ count: 0 }),
      ),
      map((result) => result.count),
    );
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
