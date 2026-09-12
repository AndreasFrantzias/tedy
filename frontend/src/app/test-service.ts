import { Injectable } from '@angular/core';
import { User } from './model/User';

@Injectable()
export class TestService {
  private users: User[] = [
    { username: 'anna', firstName: 'Anna', lastName: 'Ioannou', email: '' },
    { username: 'nikos', firstName: 'Nikos', lastName: 'Pappas',email: '' },
  ];
  getUsers(): User[] {
    return this.users;
  }
}
