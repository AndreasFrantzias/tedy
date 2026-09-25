import { IsInt, Min } from 'class-validator';

export class CreateBookingDto {
  //event ID
  @IsInt()
  @Min(1)
  eventId: number;          

  //ticket type ID
  @IsInt()
  @Min(1)
  ticketTypeId: number;     

  //number of tickets
  @IsInt()
  @Min(1)
  numberOfTickets: number;  
}
