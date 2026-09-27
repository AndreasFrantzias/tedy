import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { BookingsApiService } from '../bookings-api.service';
import { BookingDto } from '../model/booking.dto';

// Read-only list of the logged-in attendee's bookings (bookings can't be cancelled)
@Component({
  selector: 'app-my-bookings-component',
  standalone: false,
  templateUrl: './my-bookings-component.html',
  styleUrl: './my-bookings-component.css',
})
export class MyBookingsComponent {
  bookings$: Observable<BookingDto[]>;

  constructor(private bookingsApi: BookingsApiService) {
    // no refresh needed (nothing on this page changes the list)
    this.bookings$ = this.bookingsApi.findMine();
  }
}
