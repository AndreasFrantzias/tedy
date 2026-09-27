import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import * as L from 'leaflet';
import { addOsmTiles } from '../leaflet-setup';

// Form-level validator: needs both fields, so it goes on the group, not on a single control
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
  //registered changes to true after success
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
      // Default map position: Athens
      lat: [37.9838, Validators.required],
      lng: [23.7275, Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  // The map needs the div to exist first; setTimeout waits one tick for the layout to settle
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
    addOsmTiles(this.map);
    this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
    // dragging the marker or clicking the map updates lat/lng in the form
    this.marker.on('dragend', () => {
      const position = this.marker!.getLatLng();
      this.setCoordinates(position.lat, position.lng);
    });
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.setCoordinates(event.latlng.lat, event.latlng.lng);
    });
  }

  
  private setCoordinates(lat: number, lng: number): void {
    //round to 6 decimal 
    this.form.patchValue({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
    this.marker?.setLatLng([lat, lng]);
  }

  //each step can be validated on its own
  private readonly stepFields: Record<number, (keyof typeof this.form.controls)[]> = {
    1: ['username', 'password', 'confirmPassword'],
    2: ['firstName', 'lastName', 'email', 'phone', 'afm'],
    3: ['address', 'city', 'country', 'lat', 'lng'],
  };

  isStepValid(step: number): boolean {
    const fieldsValid = this.stepFields[step].every((name) => this.form.controls[name].valid);
    //step 1 also has to pass the passwords-match check on the whole form
    return step === 1 ? fieldsValid && !this.form.hasError('passwordMismatch') : fieldsValid;
  }

  // show an error onlly after the user hass interacted with the field(not on page load)
  isInvalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  nextStep(): void {
    if (!this.isStepValid(this.step)) {
      this.stepFields[this.step].forEach((name) => this.form.controls[name].markAsTouched());
      return;
    }
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
        // 409 = duplicate username; 
        if (err.status === 409) {
          this.errorMessage =
            'This username is already taken. Please choose a different one.';
        } else if (err.status === 400 && err.error?.message) {
          //400 = validation errors from the server 
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
