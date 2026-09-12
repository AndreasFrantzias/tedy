import { Component, ViewChild } from '@angular/core';
import { User } from '../model/User';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-form-example',
  standalone: false,
  templateUrl: './form-example.html',
  styleUrl: './form-example.css',
})
export class FormExample {
  user: User = {
    username: '',
    firstName: 'Ioannis',
    lastName: '',
    email: '',
  };
  @ViewChild('userForm') form?: NgForm;

  save(): void {
    console.log(this.user);
  }
}
