import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { AuthState } from './auth-state';
import { API_BASE_URL } from '../api.config';
import { HttpClient } from '@angular/common/http';
import { LoginDto } from './login.dto';
import { LoginResponseDto } from './login-response.dto';
import { JwtClaims } from './jwt-claims';
import { RegisterDto } from './register.dto';

const LOGGED_OUT: AuthState = { authenticated: false, userId: null, username: null, roles: [] };

@Injectable({
  //singleton service (one instance for entire application)
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'access_token';
  private readonly loginUrl = `${API_BASE_URL}/auth/login`;
  private readonly registerUrl = `${API_BASE_URL}/auth/register`;

  //use localStorage if available, otherwise return null
  private storage(): Storage | null {
    return typeof localStorage === 'undefined' ? null : localStorage;
  }

  //read authentication state from local storage and return it as an AuthState object
  private readState(): AuthState {
    const token = this.accessToken();
    //no token found, return unauthenticated state
    if (!token) {
      return LOGGED_OUT;
    }
    try {
      //decode the token and extract data
      const payload = token.split('.')[1];
      const claims = JSON.parse(atob(payload)) as JwtClaims;
      const expired = claims.exp * 1000 <= Date.now();
      if (expired) {
        this.storage()?.removeItem(this.tokenKey);
        return LOGGED_OUT;
      }
      return {
        authenticated: true,
        userId: claims.sub,
        username: claims.username,
        roles: claims.roles,
      };
    } catch {
      this.storage()?.removeItem(this.tokenKey);
      return LOGGED_OUT;
    }
  }

  //BehaviorSubject holds authentication state and allows subscribers to be notified of changes
  private readonly stateSubject = new BehaviorSubject<AuthState>(this.readState());

  readonly state$ = this.stateSubject.asObservable();

  constructor(private http: HttpClient) {}

  //login send POST request to login endpoint with user info
  login(dto: LoginDto): Observable<void> {
    return this.http.post<LoginResponseDto>(this.loginUrl, dto).pipe(
      tap((response) => {
        //store access token to local storage 
        this.storage()?.setItem(this.tokenKey, response.access_token);
        //update authentication state 
        this.stateSubject.next(this.readState());
      }),
      map(() => void 0),
    );
  }

  // Register: just sends POST
  register(dto: RegisterDto): Observable<void> {
    return this.http.post(this.registerUrl, dto).pipe(map(() => void 0));
  }

  // Logout: deletes token
  logout(): void {
    this.storage()?.removeItem(this.tokenKey);
    this.stateSubject.next(this.readState());
  }

  // Gets the token
  accessToken(): string | null {
    return this.storage()?.getItem(this.tokenKey) ?? null;
  }

  // Checks if the user is logged in
  isLoggedIn(): boolean {
    return this.stateSubject.value.authenticated;
  }

  // Checks if the user has a specific role
  hasRole(role: string): boolean {
    return this.stateSubject.value.roles.includes(role);
  }

  // Gets the ID of the current user
  currentUserId(): number | null {
    return this.stateSubject.value.userId;
  }
}
