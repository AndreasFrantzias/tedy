import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { AuthState } from './auth-state';
import { API_BASE_URL } from '../api.config';
import { HttpClient } from '@angular/common/http';
import { LoginDto } from './login.dto';
import { LoginResponseDto } from './login-response.dto';
import { JwtClaims } from './jwt-claims';
import { RegisterDto } from './register.dto';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'access_token';
  private readonly loginUrl = `${API_BASE_URL}/auth/login`;
  private readonly registerUrl = `${API_BASE_URL}/auth/register`;

  private storage(): Storage | null {
    return typeof localStorage === 'undefined' ? null : localStorage;
  }

  private readState(): AuthState {
    const token = this.accessToken();
    if (!token) {
      return {
        authenticated: false,
        userId: null,
        username: null,
        roles: [],
      };
    }
    try {
      const payload = token.split('.')[1];
      const claims = JSON.parse(atob(payload)) as JwtClaims;
      const expired = claims.exp * 1000 <= Date.now();
      if (expired) {
        this.storage()?.removeItem(this.tokenKey);
        return {
          authenticated: false,
          userId: null,
          username: null,
          roles: [],
        };
      }
      return {
        authenticated: true,
        userId: claims.sub,
        username: claims.username,
        roles: claims.roles,
      };
    } catch {
      this.storage()?.removeItem(this.tokenKey);
      return {
        authenticated: false,
        userId: null,
        username: null,
        roles: [],
      };
    }
  }

  private readonly stateSubject = new BehaviorSubject<AuthState>(this.readState());

  readonly state$ = this.stateSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(dto: LoginDto): Observable<void> {
    return this.http.post<LoginResponseDto>(this.loginUrl, dto).pipe(
      tap((response) => {
        this.storage()?.setItem(this.tokenKey, response.access_token);
        this.stateSubject.next(this.readState());
      }),
      map(() => void 0),
    );
  }

  register(dto: RegisterDto): Observable<void> {
    return this.http.post(this.registerUrl, dto).pipe(map(() => void 0));
  }

  logout(): void {
    this.storage()?.removeItem(this.tokenKey);
    this.stateSubject.next(this.readState());
  }

  accessToken(): string | null {
    return this.storage()?.getItem(this.tokenKey) ?? null;
  }

  isLoggedIn(): boolean {
    return this.stateSubject.value.authenticated;
  }
  hasRole(role: string): boolean {
    return this.stateSubject.value.roles.includes(role);
  }

  currentUserId(): number | null {
    return this.stateSubject.value.userId;
  }
}
