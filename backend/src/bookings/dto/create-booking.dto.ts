import { IsInt, Min } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @Min(1)
  eventId: number;

  @IsInt()
  @Min(1)
  ticketTypeId: number;

  @IsInt()
  @Min(1)
  numberOfTickets: number;
}
