import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import * as L from 'leaflet';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword
    ? { passwordMismatch: true }
    : null;
}

@Component({
  selector: 'app-register-component',
  standalone: false,
  templateUrl: './register-component.html',
  styleUrl: './register-component.css',
})
export class RegisterComponent implements AfterViewInit {
  @ViewChild('mapPicker') mapPicker?: ElementRef<HTMLDivElement>;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  errorMessage = '';
  registered = false;
  step = 1;

  form = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      country: ['', Validators.required],
      afm: ['', Validators.required],
      lat: [37.9838, Validators.required],
      lng: [23.7275, Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 0);
  }

  private initMap(): void {
    if (!this.mapPicker || this.map) {
      return;
    }
    const lat = Number(this.form.controls.lat.value);
    const lng = Number(this.form.controls.lng.value);
    this.map = L.map(this.mapPicker.nativeElement).setView([lat, lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
    this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
    this.marker.on('dragend', () => {
      const position = this.marker!.getLatLng();
      this.setCoordinates(position.lat, position.lng);
    });
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.setCoordinates(event.latlng.lat, event.latlng.lng);
    });
  }

  private setCoordinates(lat: number, lng: number): void {
    this.form.patchValue({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
    this.marker?.setLatLng([lat, lng]);
  }

  nextStep(): void {
    this.step = Math.min(3, this.step + 1);
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  prevStep(): void {
    this.step = Math.max(1, this.step - 1);
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.errorMessage = '';
    this.authService.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.registered = true;
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.errorMessage =
            'This username is already taken. Please choose a different one.';
        } else if (err.status === 400 && err.error?.message) {
          this.errorMessage = Array.isArray(err.error.message)
            ? err.error.message.join(', ')
            : err.error.message;
        } else {
          this.errorMessage = 'Registration failed. Please try again.';
        }
      },
    });
  }
}
