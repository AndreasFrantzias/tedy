import { EventDto, TicketTypeDto } from './event.dto';

export interface BookingDto {
  id: number;
  bookingId: string;
  eventId: number;
  attendeeId: number;
  time: string;
  ticketTypeId: number;
  numberOfTickets: number;
  totalCost: string;
  status: string;
  event: EventDto;
  ticketType: TicketTypeDto;
}

export interface CreateBookingInput {
  eventId: number;
  ticketTypeId: number;
  numberOfTickets: number;
}
