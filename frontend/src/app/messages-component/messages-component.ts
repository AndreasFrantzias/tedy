import { Component } from '@angular/core';
import { BehaviorSubject, Observable, switchMap } from 'rxjs';
import { MessagingApiService } from '../messaging-api.service';
import { MessageDto } from '../model/message.dto';

// Inbox / Sent tabs plus a compose modal for sending and replying
@Component({
  selector: 'app-messages-component',
  standalone: false,
  templateUrl: './messages-component.html',
  styleUrl: './messages-component.css',
})
export class MessagesComponent {
  activeTab: 'inbox' | 'sent' = 'inbox';
  inbox$: Observable<MessageDto[]>;
  sent$: Observable<MessageDto[]>;

  //compose modal inputs
  composeRecipientId: number | null = null;
  composeEventId: number | null = null;
  composeSubject = '';
  composeBody = '';
  composeError = '';
  showCompose = false;

  //One emitt reloads both inboox and sent
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  constructor(private messagingApi: MessagingApiService) {
    this.inbox$ = this.refresh$.pipe(switchMap(() => this.messagingApi.inbox()));
    this.sent$ = this.refresh$.pipe(switchMap(() => this.messagingApi.sent()));
  }

  markRead(message: MessageDto): void {
    // already read, skip the request
    if (message.readAt) {
      return;
    }
    this.messagingApi.markRead(message.id).subscribe(() => this.refresh$.next());
  }

  remove(id: number): void {
    this.messagingApi.remove(id).subscribe(() => this.refresh$.next());
  }

  // Open compose pre-filled to answer the sender, keeping the same event
  reply(message: MessageDto): void {
    this.showCompose = true;
    this.composeRecipientId = message.senderId;
    this.composeEventId = message.eventId ?? null;
    this.composeSubject = `Re: ${message.subject}`;
    this.composeBody = '';
  }

  send(): void {
    if (!this.composeRecipientId || !this.composeSubject || !this.composeBody) {
      return;
    }
    this.composeError = '';
    this.messagingApi
      .send({
        recipientId: this.composeRecipientId,
        // undefined leaves the field out of the request; null would be sent as-is 
        eventId: this.composeEventId ?? undefined, 
        subject: this.composeSubject,
        body: this.composeBody,
      })
      .subscribe({
        next: () => {
          this.showCompose = false;
          this.composeSubject = '';
          this.composeBody = '';
          this.refresh$.next();
        },
        error: (err) => {
          this.composeError = err.error?.message ?? 'Could not send message';
        },
      });
  }
}
