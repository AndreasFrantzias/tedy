export interface JwtPayload {
  sub: number;          // ID του χρήστη
  username: string;     // Όνομα χρήστη
  roles: string[];      // Ρόλοι του χρήστη
}
