import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { RecommendationDto } from './model/recommendation.dto';

// Talks to the backend's /recommendations endpoint
@Injectable({ providedIn: 'root' })
export class RecommendationsApiService {
  private readonly baseUrl = `${API_BASE_URL}/recommendations`;

  constructor(private http: HttpClient) {}

  // GET /recommendations?limit=N — events suggested for the logged-in user (uses their token)
  recommend(limit = 10): Observable<RecommendationDto[]> {
    return this.http.get<RecommendationDto[]>(this.baseUrl, {
      params: { limit: String(limit) },
    });
  }
}
