import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { BookingDto, CreateBookingInput } from './model/booking.dto';

@Injectable({ providedIn: 'root' })
export class BookingsApiService {
  private readonly baseUrl = `${API_BASE_URL}/bookings`;

  constructor(private http: HttpClient) {}

  create(input: CreateBookingInput): Observable<BookingDto> {
    return this.http.post<BookingDto>(this.baseUrl, input);
  }

  findMine(): Observable<BookingDto[]> {
    return this.http.get<BookingDto[]>(`${this.baseUrl}/mine`);
  }
}
