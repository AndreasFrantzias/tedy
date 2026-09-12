import { Component } from '@angular/core';
import { BehaviorSubject, Observable, switchMap } from 'rxjs';
import { EventsApiService } from '../events-api.service';
import { MessagingApiService } from '../messaging-api.service';
import { EventDto } from '../model/event.dto';

@Component({
  selector: 'app-event-manage-component',
  standalone: false,
  templateUrl: './event-manage-component.html',
  styleUrl: './event-manage-component.css',
})
export class EventManageComponent {
  events$: Observable<EventDto[]>;
  broadcastTargetId: number | null = null;
  broadcastSubject = '';
  broadcastBody = '';
  broadcastResult = '';

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  constructor(
    private eventsApi: EventsApiService,
    private messagingApi: MessagingApiService,
  ) {
    this.events$ = this.refresh$.pipe(switchMap(() => this.eventsApi.findMine()));
  }

  publish(id: number): void {
    this.eventsApi.publish(id).subscribe(() => this.refresh$.next());
  }

  cancel(id: number): void {
    if (!confirm('Cancel this event? Attendees who already booked will keep their bookings.')) {
      return;
    }
    this.eventsApi.cancel(id).subscribe(() => this.refresh$.next());
  }

  remove(id: number): void {
    if (!confirm('Delete this event permanently?')) {
      return;
    }
    this.eventsApi.remove(id).subscribe({
      next: () => this.refresh$.next(),
      error: (err) => alert(err.error?.message ?? 'Could not delete event'),
    });
  }

  openBroadcast(id: number): void {
    this.broadcastTargetId = id;
    this.broadcastSubject = '';
    this.broadcastBody = '';
    this.broadcastResult = '';
  }

  sendBroadcast(): void {
    if (!this.broadcastTargetId) {
      return;
    }
    this.messagingApi
      .broadcast(this.broadcastTargetId, {
        subject: this.broadcastSubject,
        body: this.broadcastBody,
      })
      .subscribe((res) => {
        this.broadcastResult = `Notified ${res.sent} attendee(s).`;
        this.eventsApi.cancel(this.broadcastTargetId!).subscribe(() => this.refresh$.next());
      });
  }
}
