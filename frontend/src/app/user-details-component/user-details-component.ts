import {Component, OnInit} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {PublicUserDto} from '../model/public-user.dto';
import {UsersApiService} from '../users-api.service';
import {combineLatest, map, Observable, of, switchMap} from 'rxjs';
import {AuthService} from '../auth/auth.service';

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
    this.user$ = combineLatest([
      this.route.paramMap.pipe(
        map(params => Number(params.get('id')))
      ),
      this.authService.state$
    ]).pipe(
      switchMap(([id, state]) =>
        state.authenticated
          ? this.usersApi.findOne(id)
          : of(undefined)
      )
    );
  }
}
