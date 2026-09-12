import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  CategoryDto,
  CreateEventInput,
  EventDto,
  SearchEventsParams,
  SearchEventsResult,
} from './model/event.dto';

@Injectable({ providedIn: 'root' })
export class EventsApiService {
  private readonly baseUrl = `${API_BASE_URL}/events`;

  constructor(private http: HttpClient) {}

  search(params: SearchEventsParams): Observable<SearchEventsResult> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<SearchEventsResult>(this.baseUrl, { params: httpParams });
  }

  findOne(id: number): Observable<EventDto> {
    return this.http.get<EventDto>(`${this.baseUrl}/${id}`);
  }

  findMine(): Observable<EventDto[]> {
    return this.http.get<EventDto[]>(`${this.baseUrl}/mine`);
  }

  findCategories(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(`${this.baseUrl}/categories`);
  }

  create(input: CreateEventInput): Observable<EventDto> {
    return this.http.post<EventDto>(this.baseUrl, input);
  }

  update(id: number, input: Partial<CreateEventInput>): Observable<EventDto> {
    return this.http.patch<EventDto>(`${this.baseUrl}/${id}`, input);
  }

  publish(id: number): Observable<EventDto> {
    return this.http.post<EventDto>(`${this.baseUrl}/${id}/publish`, {});
  }

  cancel(id: number): Observable<EventDto> {
    return this.http.post<EventDto>(`${this.baseUrl}/${id}/cancel`, {});
  }

  remove(id: number): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/${id}`);
  }
}
