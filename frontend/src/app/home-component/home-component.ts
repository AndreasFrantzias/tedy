import { Component } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthState } from '../auth/auth-state';
import { RecommendationsApiService } from '../recommendations-api.service';
import { RecommendationDto } from '../model/recommendation.dto';

@Component({
  selector: 'app-home-component',
  standalone: false,
  templateUrl: './home-component.html',
  styleUrl: './home-component.css',
})
export class HomeComponent {
  authState$: Observable<AuthState>;
  recommendations$: Observable<RecommendationDto[]>;

  constructor(
    private authService: AuthService,
    private recommendationsApi: RecommendationsApiService,
  ) {
    this.authState$ = this.authService.state$;
    this.recommendations$ = this.authState$.pipe(
      switchMap((state) =>
        state.authenticated ? this.recommendationsApi.recommend(6) : of([]),
      ),
    );
  }
}
