export interface JwtPayload {
  //user ID
  sub: number;           
  username: string;     
  roles: string[];      
}
