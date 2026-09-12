import { Component, provideBrowserGlobalErrorListeners } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { TestService } from '../test-service';
import { User } from '../model/User';

@Component({
  selector: 'app-reactive-example',
  standalone: false,
  templateUrl: './reactive-example.html',
  styleUrl: './reactive-example.css',
  providers: [TestService],
})
export class ReactiveExample {

  users?: User[];
  constructor(private testService: TestService) { }

  ngOnInit() {
    this.users = this.testService.getUsers();
  }

  form = new FormGroup({
    username: new FormControl('', [Validators.required]),
    email: new FormControl('', [
      Validators.required,
      Validators.email
    ])
  });
  save(): void {
    console.log(this.form.value);
  }
}
