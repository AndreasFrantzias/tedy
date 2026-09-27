import { Component } from '@angular/core';
import { BehaviorSubject, Observable, switchMap } from 'rxjs';
import { EventsApiService } from '../events-api.service';
import { MessagingApiService } from '../messaging-api.service';
import { EventDto } from '../model/event.dto';

// Organizer pge for managing their own events (publish, cancel, delete, message attendees)
@Component({
  selector: 'app-event-manage-component',
  standalone: false,
  templateUrl: './event-manage-component.html',
  styleUrl: './event-manage-component.css',
})
export class EventManageComponent {
  events$: Observable<EventDto[]>;
  //state for the broadcast message form
  broadcastTargetId: number | null = null;
  broadcastSubject = '';
  broadcastBody = '';
  broadcastResult = '';

  // Emitting on this reloads the event list
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  constructor(
    private eventsApi: EventsApiService,
    private messagingApi: MessagingApiService,
  ) {
    // Fetch the current user's events, and refetch whenever refresh$ emits
    this.events$ = this.refresh$.pipe(switchMap(() => this.eventsApi.findMine()));
  }

  // make a draft event public, then reload the list
  publish(id: number): void {
    this.eventsApi.publish(id).subscribe(() => this.refresh$.next());
  }

  // Cancel an event after  user confirms
  cancel(id: number): void {
    if (!confirm('Cancel this event? Attendees who already booked will keep their bookings.')) {
      return;
    }
    this.eventsApi.cancel(id).subscribe(() => this.refresh$.next());
  }

  // Permanently delete an event after the user confirms; show the server error if it fails
  remove(id: number): void {
    if (!confirm('Delete this event permanently?')) {
      return;
    }
    this.eventsApi.remove(id).subscribe({
      next: () => this.refresh$.next(),
      error: (err) => alert(err.error?.message ?? 'Could not delete event'),
    });
  }

  // Open the broadcast form for an event and clear any previous input
  openBroadcast(id: number): void {
    this.broadcastTargetId = id;
    this.broadcastSubject = '';
    this.broadcastBody = '';
    this.broadcastResult = '';
  }

  // send a message to all attendees of the selected event, then cancel the event
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
