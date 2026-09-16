import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UsersComponent } from './users-component/users-component';
import { UserDetailsComponent } from './user-details-component/user-details-component';
import { NotFoundComponent } from './not-found-component/not-found-component';
import { HomeComponent} from './home-component/home-component';
import {LoginComponent} from './login-component/login-component';
import {AuthGuard} from './auth/auth.guard';
import {RoleGuard} from './auth/role.guard';
import {ForbiddenComponent} from './forbidden-component/forbidden-component';
import {RegisterComponent} from './register-component/register-component';
import {EventManageComponent} from './event-manage-component/event-manage-component';
import {EventFormComponent} from './event-form-component/event-form-component';
import {EventsBrowseComponent} from './events-browse-component/events-browse-component';
import {EventDetailComponent} from './event-detail-component/event-detail-component';
import {MessagesComponent} from './messages-component/messages-component';
import {MyBookingsComponent} from './my-bookings-component/my-bookings-component';

const requireRole = (role: string) => ({
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: [role] },
});

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [AuthGuard],
    children: [
      { path: ':id', component: UserDetailsComponent }
    ],
  },
  { path: 'forbidden', component: ForbiddenComponent },
  { path: 'admin/users', component: UsersComponent, ...requireRole('admin') },
  { path: 'events', component: EventsBrowseComponent },
  { path: 'events/:id', component: EventDetailComponent },
  { path: 'my-events', component: EventManageComponent, ...requireRole('organizer') },
  { path: 'my-events/new', component: EventFormComponent, ...requireRole('organizer') },
  { path: 'my-events/:id/edit', component: EventFormComponent, ...requireRole('organizer') },
  { path: 'my-bookings', component: MyBookingsComponent, ...requireRole('attendee') },
  {
    path: 'messages',
    component: MessagesComponent,
    canActivate: [AuthGuard],
  },
  { path: '**', component: NotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
