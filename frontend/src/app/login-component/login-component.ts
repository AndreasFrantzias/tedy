import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

// Login form, shown on the home page for guests
@Component({
  selector: 'app-login-component',
  standalone: false,
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // when login fails
  errorMessage = '';
  // Login form with two required fields;
  form = this.fb.nonNullable.group({
    // nonNullable (reset() goes back to '' instead of null)
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  // Send the credentials to the server and redirect based on the user's role
  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        //admin goes to the user management page
        if (this.authService.hasRole('admin')) {
          this.router.navigate(['/admin/users']);
        } else {
          //others to the home page
          this.router.navigate(['/home']);
        }
      },
      // Show the server's error message, or a default one
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Λάθος username ή password';
      },
    });
  }
}
