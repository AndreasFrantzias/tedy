import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

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

  errorMessage = '';
  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        // Μεταφορά ανάλογα με ρόλο
        if (this.authService.hasRole('admin')) {
          this.router.navigate(['/admin/users']);
        } else if (this.authService.hasRole('organizer')) {
          this.router.navigate(['/my-events']);
        } else {
          this.router.navigate(['/events']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Λάθος username ή password';
      },
    });
  }
}
