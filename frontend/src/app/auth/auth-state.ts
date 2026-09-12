export interface AuthState {
  authenticated: boolean;
  userId: number | null;
  username: string | null;
  roles: string[];
}
