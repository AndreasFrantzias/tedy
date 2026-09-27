import {Component, OnInit} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {PublicUserDto} from '../model/public-user.dto';
import {UsersApiService} from '../users-api.service';
import {combineLatest, map, Observable, of, switchMap} from 'rxjs';
import {AuthService} from '../auth/auth.service';

//Admin page showing one user's full profile 
@Component({
  selector: 'app-user-details-component',
  standalone: false,
  templateUrl: './user-details-component.html',
  styleUrl: './user-details-component.css',
})
export class UserDetailsComponent  {
  user$: Observable<PublicUserDto | undefined>;

  constructor(
    private route: ActivatedRoute,
    private usersApi: UsersApiService,
    private authService: AuthService)
  {
    // Re-fetch wheneever the :id in the URL or the login state changes
    this.user$ = combineLatest([
      this.route.paramMap.pipe(
        map(params => Number(params.get('id')))
      ),
      this.authService.state$
    ]).pipe(
      // only call the API when logged in; otherwise emit undefined so the template shows nothing
      switchMap(([id, state]) =>
        state.authenticated
          ? this.usersApi.findOne(id)
          : of(undefined)
      )
    );
  }
}
