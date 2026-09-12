import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, switchMap } from 'rxjs';
import { EventsApiService } from '../events-api.service';
import { CategoryDto, SearchEventsParams, SearchEventsResult } from '../model/event.dto';
import { AuthService } from '../auth/auth.service';
import { AuthState } from '../auth/auth-state';

@Component({
  selector: 'app-events-browse-component',
  standalone: false,
  templateUrl: './events-browse-component.html',
  styleUrl: './events-browse-component.css',
})
export class EventsBrowseComponent implements OnInit {
  categories: CategoryDto[] = [];
  results$: Observable<SearchEventsResult>;
  authState$: Observable<AuthState>;

  filters: SearchEventsParams = { page: 1, pageSize: 9 };

  private readonly params$ = new BehaviorSubject<SearchEventsParams>(this.filters);

  constructor(private eventsApi: EventsApiService, private authService: AuthService) {
    this.authState$ = this.authService.state$;
    this.results$ = this.params$.pipe(switchMap((params) => this.eventsApi.search(params)));
  }

  ngOnInit(): void {
    this.eventsApi.findCategories().subscribe((categories) => (this.categories = categories));
  }

  search(): void {
    this.filters.page = 1;
    this.params$.next({ ...this.filters });
  }

  goToPage(page: number): void {
    this.filters.page = page;
    this.params$.next({ ...this.filters });
  }

  reset(): void {
    this.filters = { page: 1, pageSize: 9 };
    this.params$.next({ ...this.filters });
  }
}
