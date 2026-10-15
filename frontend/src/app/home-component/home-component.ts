import { Component } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthState } from '../auth/auth-state';
import { RecommendationsApiService } from '../recommendations-api.service';
import { RecommendationDto } from '../model/recommendation.dto';

//landing page
@Component({
  selector: 'app-home-component',
  standalone: false,
  templateUrl: './home-component.html',
  styleUrl: './home-component.css',
})
export class HomeComponent {
  // Login state (username, roles), used by the template to pick what to show
  authState$: Observable<AuthState>;
  // recomended events for the current user
  recommendations$: Observable<RecommendationDto[]>;

  constructor(
    private authService: AuthService,
    private recommendationsApi: RecommendationsApiService,
  ) {
    this.authState$ = this.authService.state$;
    // whenever the login state changes, fetch 6 recommendations if logged in, otherwise use an empty list
    this.recommendations$ = this.authState$.pipe(
      switchMap((state) =>
        state.authenticated ? this.recommendationsApi.recommend(6) : of([]),
      ),
    );
  }
}
