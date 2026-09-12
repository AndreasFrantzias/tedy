export interface PublicUserDto {
  id: number;
  username: string;
  email: string;
  roles: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  afm: string | null;
}
