import { Component } from '@angular/core';
import { PublicUserDto } from '../model/public-user.dto';
import { UsersApiService } from '../users-api.service';
import { AuthService } from '../auth/auth.service';
import { BehaviorSubject, Observable, of, switchMap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { HttpClient } from '@angular/common/http';

// Admin console
@Component({
  selector: 'app-users-component',
  standalone: false,
  templateUrl: './users-component.html',
  styleUrl: './users-component.css',
})
export class UsersComponent {
  users$: Observable<PublicUserDto[]>;
  pendingUsers$: Observable<PublicUserDto[]>;
  isAdmin$: Observable<boolean>;
  exportXmlUrl = `${API_BASE_URL}/export/events.xml`;
  exportJsonUrl = `${API_BASE_URL}/export/events.json`;
  query = ''; 
  activeTab: 'pending' | 'all' | 'organizers' | 'attendees' | 'export' = 'pending';

  // emitting reloads the pending list (after approve/reject)
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  constructor(
    private usersApi: UsersApiService,
    private authService: AuthService,
    private http: HttpClient
  ) {
    // All users, loaded only when logged in
    this.users$ = this.authService.state$.pipe(
      switchMap(state =>
        state.authenticated
          ? this.usersApi.findAll()
          : of([])
      )
    );

    this.isAdmin$ = this.authService.state$.pipe(
      switchMap(state => of(state.authenticated && state.roles.includes('admin')))
    );

    this.pendingUsers$ = this.refresh$.pipe(
      switchMap(() =>
        this.authService.hasRole('admin') ? this.usersApi.findPending() : of([])
      )
    );
  }

  approve(id: number): void {
    this.usersApi.approve(id).subscribe(() => this.refresh$.next());
  }

  reject(id: number): void {
    this.usersApi.reject(id).subscribe(() => this.refresh$.next());
  }

  // case-insensitive search across name, email and status; empty search matches everyone
  matches(user: PublicUserDto): boolean {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return [user.username, user.email, user.firstName, user.lastName, user.status]
      .filter(Boolean) // skip empty/missing fields
      .some((value) => String(value).toLowerCase().includes(q));
  }

  // users for the current tab, that also match the search
  visibleUsers(users: PublicUserDto[]): PublicUserDto[] {
    return users.filter((user) => {
      const roleMatches =
        this.activeTab === 'organizers'
          ? user.roles.includes('organizer')
          : this.activeTab === 'attendees'
            ? user.roles.includes('attendee')
            : true;
      return roleMatches && this.matches(user);
    });
  }

  // Download via HttpClient (not a plain link) so the interceptor adds the admin token
  exportFile(format: 'xml' | 'json'): void {
    const fileUrl = format === 'xml' ? this.exportXmlUrl : this.exportJsonUrl;
    this.http
      .get(fileUrl, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `events.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.activeTab = 'export';
        },
        error: (err) => {
          console.error(`Export ${format} failed`, err);
        },
      });
  }
}
