import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventsApiService } from '../events-api.service';
import { CreateEventInput } from '../model/event.dto';
import * as L from 'leaflet';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

@Component({
  selector: 'app-event-form-component',
  standalone: false,
  templateUrl: './event-form-component.html',
  styleUrl: './event-form-component.css',
})
export class EventFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('eventMapPicker') eventMapPicker?: ElementRef<HTMLDivElement>;

  private fb = inject(FormBuilder);
  private eventsApi = inject(EventsApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  eventDbId: number | null = null;
  errorMessage = '';

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    eventType: ['', Validators.required],
    venue: ['', Validators.required],
    address: ['', Validators.required],
    city: ['', Validators.required],
    country: ['', Validators.required],
    lat: this.fb.control<number | null>(null),
    lng: this.fb.control<number | null>(null),
    startDateTime: ['', Validators.required],
    endDateTime: ['', Validators.required],
    capacity: [1, [Validators.required, Validators.min(1)]],
    description: ['', Validators.required],
    categories: this.fb.array([this.fb.nonNullable.control('', Validators.required)]),
    ticketTypes: this.fb.array([this.createTicketTypeGroup()]),
    photos: this.fb.array<string>([]),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.eventDbId = Number(idParam);
      this.eventsApi.findOne(this.eventDbId).subscribe((event) => {
        this.categories.clear();
        event.categories.forEach((c) => this.categories.push(this.fb.nonNullable.control(c.name, Validators.required)));

        this.ticketTypes.clear();
        event.ticketTypes.forEach((t) =>
          this.ticketTypes.push(
            this.fb.nonNullable.group({
              ticketTypeId: [t.ticketTypeId, Validators.required],
              name: [t.name, Validators.required],
              price: [Number(t.price), [Validators.required, Validators.min(0)]],
              quantity: [t.quantity, [Validators.required, Validators.min(1)]],
            }),
          ),
        );

        this.photos.clear();
        event.photos.forEach((p) => this.photos.push(this.fb.nonNullable.control(p.url)));

        this.form.patchValue({
          title: event.title,
          eventType: event.eventType,
          venue: event.venue,
          address: event.address,
          city: event.city,
          country: event.country,
          lat: event.lat,
          lng: event.lng,
          startDateTime: event.startDateTime.slice(0, 16),
          endDateTime: event.endDateTime.slice(0, 16),
          capacity: event.capacity,
          description: event.description,
        });
        setTimeout(() => this.syncMapFromForm(), 0);
      });
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 0);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  get categories(): FormArray {
    return this.form.get('categories') as FormArray;
  }

  get ticketTypes(): FormArray {
    return this.form.get('ticketTypes') as FormArray;
  }

  get photos(): FormArray {
    return this.form.get('photos') as FormArray;
  }

  private createTicketTypeGroup() {
    return this.fb.nonNullable.group({
      ticketTypeId: ['', Validators.required],
      name: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
  }

  private initMap(): void {
    if (!this.eventMapPicker || this.map) {
      return;
    }
    const lat = Number(this.form.controls.lat.value ?? 37.9838);
    const lng = Number(this.form.controls.lng.value ?? 23.7275);
    this.map = L.map(this.eventMapPicker.nativeElement).setView([lat, lng], 12);
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

  syncMapFromForm(): void {
    const lat = Number(this.form.controls.lat.value ?? 37.9838);
    const lng = Number(this.form.controls.lng.value ?? 23.7275);
    this.marker?.setLatLng([lat, lng]);
    this.map?.setView([lat, lng], this.map.getZoom());
    this.map?.invalidateSize();
  }

  private setCoordinates(lat: number, lng: number): void {
    this.form.patchValue({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
    this.marker?.setLatLng([lat, lng]);
  }

  addCategory(): void {
    this.categories.push(this.fb.nonNullable.control('', Validators.required));
  }

  removeCategory(index: number): void {
    this.categories.removeAt(index);
  }

  addTicketType(): void {
    this.ticketTypes.push(this.createTicketTypeGroup());
  }

  removeTicketType(index: number): void {
    this.ticketTypes.removeAt(index);
  }

  addPhoto(): void {
    this.photos.push(this.fb.nonNullable.control(''));
  }

  removePhoto(index: number): void {
    this.photos.removeAt(index);
  }

  get totalTicketQuantity(): number {
    return this.ticketTypes.controls.reduce(
      (sum, ctrl) => sum + (Number(ctrl.get('quantity')?.value) || 0),
      0,
    );
  }

  get capacityExceeded(): boolean {
    return this.totalTicketQuantity > (Number(this.form.get('capacity')?.value) || 0);
  }

  submit(): void {
    if (this.form.invalid || this.capacityExceeded) {
      return;
    }
    this.errorMessage = '';
    const raw = this.form.getRawValue();
    const input: CreateEventInput = {
      title: raw.title,
      eventType: raw.eventType,
      venue: raw.venue,
      address: raw.address,
      city: raw.city,
      country: raw.country,
      lat: raw.lat ?? undefined,
      lng: raw.lng ?? undefined,
      startDateTime: new Date(raw.startDateTime).toISOString(),
      endDateTime: new Date(raw.endDateTime).toISOString(),
      capacity: raw.capacity,
      description: raw.description,
      categories: raw.categories,
      ticketTypes: raw.ticketTypes,
      photos: raw.photos.filter((url): url is string => !!url),
    };

    const request = this.eventDbId
      ? this.eventsApi.update(this.eventDbId, input)
      : this.eventsApi.create(input);

    request.subscribe({
      next: () => this.router.navigate(['/my-events']),
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Could not save event';
      },
    });
  }
}
