export interface MessageDto {
  id: number;
  senderId: number;
  recipientId: number;
  eventId: number | null;
  subject: string;
  body: string;
  sentAt: string;
  readAt: string | null;
  deletedBySender: boolean;
  deletedByRecipient: boolean;
  sender?: { id: number; username: string };
  recipient?: { id: number; username: string };
  event?: { id: number; title: string } | null;
}

export interface SendMessageInput {
  recipientId: number;
  eventId?: number;
  subject: string;
  body: string;
}

export interface BroadcastMessageInput {
  subject: string;
  body: string;
}
