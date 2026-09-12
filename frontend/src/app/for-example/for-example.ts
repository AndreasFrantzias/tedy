import { Component } from '@angular/core';
import { User } from '../model/User';

@Component({
  selector: 'app-for-example',
  standalone: false,
  templateUrl: './for-example.html',
  styleUrl: './for-example.css',
})
export class ForExample {
  users: User[] = [
    { username: 'anna', firstName: 'Anna', lastName: 'Ioannou', email: '' },
    { username: 'nikos', firstName: 'Nikos', lastName: 'Pappas', email: '' },
  ];
}
