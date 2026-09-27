import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, switchMap } from 'rxjs';
import { EventsApiService } from '../events-api.service';
import { CategoryDto, SearchEventsParams, SearchEventsResult } from '../model/event.dto';
import { AuthService } from '../auth/auth.service';
import { AuthState } from '../auth/auth-state';

// public page for searching and browsing events with filters 
@Component({
  selector: 'app-events-browse-component',
  standalone: false,
  templateUrl: './events-browse-component.html',
  styleUrl: './events-browse-component.css',
})
export class EventsBrowseComponent implements OnInit {
  categories: CategoryDto[] = [];
  results$: Observable<SearchEventsResult>;
  // Login state, used by the template to show or hide actions
  authState$: Observable<AuthState>;

  // current search filters, bound to the filter form in the template
  filters: SearchEventsParams = { page: 1, pageSize: 9 };

  // Emitting new params on this triggers a new search
  private readonly params$ = new BehaviorSubject<SearchEventsParams>(this.filters);

  constructor(private eventsApi: EventsApiService, private authService: AuthService) {
    this.authState$ = this.authService.state$;
    // Run a search whenever params$ emits; switchMap drops the old request if a new one starts
    this.results$ = this.params$.pipe(switchMap((params) => this.eventsApi.search(params)));
  }

  // Load the categories for the filter dropdown
  ngOnInit(): void {
    this.eventsApi.findCategories().subscribe((categories) => (this.categories = categories));
  }

  // apply the filters and go back to the first page
  search(): void {
    this.filters.page = 1;
    this.params$.next({ ...this.filters });
  }

  // Load a specific page of results with the same filters
  goToPage(page: number): void {
    this.filters.page = page;
    this.params$.next({ ...this.filters });
  }

  // Clear all filters and show the first page
  reset(): void {
    this.filters = { page: 1, pageSize: 9 };
    this.params$.next({ ...this.filters });
  }
}
