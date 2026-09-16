import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { addOsmTiles } from '../leaflet-setup';
import { EventsApiService } from '../events-api.service';
import { BookingsApiService } from '../bookings-api.service';
import { AuthService } from '../auth/auth.service';
import { EventDto } from '../model/event.dto';

@Component({
  selector: 'app-event-detail-component',
  standalone: false,
  templateUrl: './event-detail-component.html',
  styleUrl: './event-detail-component.css',
})
export class EventDetailComponent implements OnInit {
  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  event: EventDto | null = null;
  selectedTicketTypeId: number | null = null;
  numberOfTickets = 1;
  bookingMessage = '';
  bookingError = '';
  isAuthenticated = false;
  showBookingModal = false;

  private map: L.Map | null = null;
  private eventDbId!: number;

  constructor(
    private route: ActivatedRoute,
    private eventsApi: EventsApiService,
    private bookingsApi: BookingsApiService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isLoggedIn();
    this.eventDbId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadEvent();
  }

  private loadEvent(): void {
    this.eventsApi.findOne(this.eventDbId).subscribe((event) => {
      this.event = event;
      this.selectedTicketTypeId = event.ticketTypes[0]?.id ?? null;
      setTimeout(() => this.initMap(), 0);
    });
  }

  private initMap(): void {
    if (!this.event || this.event.lat === null || this.event.lng === null || !this.mapContainer) {
      return;
    }
    if (this.map) {
      this.map.remove();
    }
    this.map = L.map(this.mapContainer.nativeElement).setView([this.event.lat, this.event.lng], 14);
    addOsmTiles(this.map);
    L.marker([this.event.lat, this.event.lng]).addTo(this.map).bindPopup(this.event.venue);
  }

  book(): void {
    if (!this.event || !this.selectedTicketTypeId) {
      return;
    }
    this.showBookingModal = true;
  }

  confirmBooking(): void {
    if (!this.event || !this.selectedTicketTypeId) {
      return;
    }
    this.bookingError = '';
    this.bookingMessage = '';
    this.bookingsApi
      .create({
        eventId: this.event.id,
        ticketTypeId: this.selectedTicketTypeId,
        numberOfTickets: this.numberOfTickets,
      })
      .subscribe({
        next: () => {
          this.bookingMessage = 'Booking confirmed!';
          this.showBookingModal = false;
          this.loadEvent();
        },
        error: (err) => {
          this.bookingError = err.error?.message ?? 'Booking failed';
        },
      });
  }

  selectedTicketName(): string {
    return this.event?.ticketTypes.find((ticket) => ticket.id === this.selectedTicketTypeId)?.name ?? 'ticket';
  }
}
