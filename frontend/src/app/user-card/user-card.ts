import { Component } from '@angular/core';
import {User} from '../model/User';

@Component({
  selector: 'app-user-card',
  standalone: false,
  templateUrl: './user-card.html',
  styleUrl: './user-card.css',
})
export class UserCard {

  interaction: string = "";
  user: User = {
    username: 'anna',
    firstName: 'Anna',
    lastName: 'Ioannou',
    email: 'foo@foo',
  };

  query = '';
  selectedUser?: User;

  selectUser(user: User): void {
    this.selectedUser = user;
    this.interaction = "User was selected"
  }
  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.query = input.value;
    this.interaction = "Search was made with query: " + this.query;
  }
}
