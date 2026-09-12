import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { BroadcastMessageInput, MessageDto, SendMessageInput } from './model/message.dto';

@Injectable({ providedIn: 'root' })
export class MessagingApiService {
  private readonly baseUrl = `${API_BASE_URL}/messages`;

  constructor(private http: HttpClient) {}

  inbox(): Observable<MessageDto[]> {
    return this.http.get<MessageDto[]>(`${this.baseUrl}/inbox`);
  }

  sent(): Observable<MessageDto[]> {
    return this.http.get<MessageDto[]>(`${this.baseUrl}/sent`);
  }

  unreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`);
  }

  send(input: SendMessageInput): Observable<MessageDto> {
    return this.http.post<MessageDto>(this.baseUrl, input);
  }

  broadcast(eventId: number, input: BroadcastMessageInput): Observable<{ sent: number }> {
    return this.http.post<{ sent: number }>(`${this.baseUrl}/broadcast/${eventId}`, input);
  }

  markRead(id: number): Observable<MessageDto> {
    return this.http.patch<MessageDto>(`${this.baseUrl}/${id}/read`, {});
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
