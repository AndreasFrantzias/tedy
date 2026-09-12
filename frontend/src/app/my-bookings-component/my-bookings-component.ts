import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { BookingsApiService } from '../bookings-api.service';
import { BookingDto } from '../model/booking.dto';

@Component({
  selector: 'app-my-bookings-component',
  standalone: false,
  templateUrl: './my-bookings-component.html',
  styleUrl: './my-bookings-component.css',
})
export class MyBookingsComponent {
  bookings$: Observable<BookingDto[]>;

  constructor(private bookingsApi: BookingsApiService) {
    this.bookings$ = this.bookingsApi.findMine();
  }
}
