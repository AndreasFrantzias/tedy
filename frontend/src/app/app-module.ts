import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { UserCard } from './user-card/user-card';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UsersComponent } from './users-component/users-component';
import { UserDetailsComponent } from './user-details-component/user-details-component';
import { NotFoundComponent } from './not-found-component/not-found-component';
import { HomeComponent } from './home-component/home-component';
import { ForExample } from './for-example/for-example';
import { HighlightDirective } from './highlight-directive';
import { InputExample } from './input-example/input-example';
import { FormExample } from './form-example/form-example';
import { ReactiveExample } from './reactive-example/reactive-example';
import { TestService } from './test-service';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { LoginComponent } from './login-component/login-component';
import { AuthInterceptor } from './auth/auth.interceptor';
import { ForbiddenComponent } from './forbidden-component/forbidden-component';
import { RegisterComponent } from './register-component/register-component';
import { EventManageComponent } from './event-manage-component/event-manage-component';
import { EventFormComponent } from './event-form-component/event-form-component';
import { EventsBrowseComponent } from './events-browse-component/events-browse-component';
import { EventDetailComponent } from './event-detail-component/event-detail-component';
import { MessagesComponent } from './messages-component/messages-component';
import { MyBookingsComponent } from './my-bookings-component/my-bookings-component';

@NgModule({
  declarations: [
    App,
    UserCard,
    UsersComponent,
    UserDetailsComponent,
    NotFoundComponent,
    HomeComponent,
    ForExample,
    HighlightDirective,
    InputExample,
    FormExample,
    ReactiveExample,
    LoginComponent,
    ForbiddenComponent,
    RegisterComponent,
    EventManageComponent,
    EventFormComponent,
    EventsBrowseComponent,
    EventDetailComponent,
    MessagesComponent,
    MyBookingsComponent,
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule, ReactiveFormsModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [App],
})
export class AppModule {}
