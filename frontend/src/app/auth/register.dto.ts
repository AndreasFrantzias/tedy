export interface RegisterDto {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  afm: string;
  lat?: number;
  lng?: number;
}
