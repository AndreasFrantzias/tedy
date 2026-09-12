import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { PublicUserDto } from './model/public-user.dto';

@Injectable({ providedIn: 'root' })

export class UsersApiService {
  private readonly baseUrl = `${API_BASE_URL}/users`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<PublicUserDto[]> {
    return this.http.get<PublicUserDto[]>(this.baseUrl);
  }

  findPending(): Observable<PublicUserDto[]> {
    return this.http.get<PublicUserDto[]>(`${this.baseUrl}/pending`);
  }

  findOne(id: number): Observable<PublicUserDto> {
    return this.http.get<PublicUserDto>(`${this.baseUrl}/${id}`);
  }

  approve(id: number): Observable<PublicUserDto> {
    return this.http.patch<PublicUserDto>(`${this.baseUrl}/${id}/approve`, {});
  }

  reject(id: number): Observable<PublicUserDto> {
    return this.http.patch<PublicUserDto>(`${this.baseUrl}/${id}/reject`, {});
  }
}
