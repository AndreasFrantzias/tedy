export interface JwtClaims {
  sub: number;
  username: string;
  roles: string[];
  exp: number;
}
