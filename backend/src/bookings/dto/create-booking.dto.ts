import { IsInt, Min } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @Min(1)
  eventId: number;          // ID του event

  @IsInt()
  @Min(1)
  ticketTypeId: number;     // ID του ticket type

  @IsInt()
  @Min(1)
  numberOfTickets: number;  // Πλήθος εισιτηρίων
}
