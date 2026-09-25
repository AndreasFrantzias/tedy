import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(attendeeId: number, dto: CreateBookingDto) {
    if (dto.numberOfTickets < 1) {
      throw new BadRequestException('Number of tickets must be at least 1');
    }

    try {
      //transcation ensures atomicity(all succed or nothing)
      return await this.prisma.$transaction(
        async (tx) => {
          //lock event row to prevent concurrent bookings that exceed capacity
          await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${dto.eventId} FOR UPDATE`;

          //load event and check if it exists and is published
          const event = await tx.event.findUnique({
            where: { id: dto.eventId },
          });
          if (!event) {
            throw new NotFoundException('Event not found');
          }
          if (event.status !== 'PUBLISHED') {
            throw new BadRequestException('Event is not open for bookings');
          }

          //check if ticket type  exists for the event
          const ticketType = await tx.ticketType.findFirst({
            where: { id: dto.ticketTypeId, eventId: dto.eventId },
          });
          if (!ticketType) {
            throw new NotFoundException('Ticket type not found for this event');
          }

          //check capacity and available tickets
          const booked = await tx.booking.aggregate({
            where: { eventId: dto.eventId, status: { not: 'CANCELLED' } },
            _sum: { numberOfTickets: true },
          });
          const bookedSeats = booked._sum.numberOfTickets ?? 0;
          if (bookedSeats + dto.numberOfTickets > event.capacity) {
            throw new BadRequestException(
              'Not enough remaining event capacity',
            );
          }

          //decrement available tickets for  ticket type
          const decremented = await tx.ticketType.updateMany({
            where: {
              id: dto.ticketTypeId,
              eventId: dto.eventId,
              //available >= numberoftickets
              available: { gte: dto.numberOfTickets },
            },
            //decrement available tickets
            data: { available: { decrement: dto.numberOfTickets } },
          });
          //no updates,means not enough available tickets for this ticket type
          if (decremented.count === 0) {
            throw new BadRequestException(
              'Not enough available tickets for this ticket type',
            );
          }

          //create booking 
          const booking = await tx.booking.create({
            data: {
              bookingId: 'PENDING',
              eventId: dto.eventId,
              attendeeId,
              ticketTypeId: dto.ticketTypeId,
              numberOfTickets: dto.numberOfTickets,
              totalCost: Number(ticketType.price) * dto.numberOfTickets,
              status: 'CONFIRMED',
            },
          });

          //update bookingId to a unique value after creation
          return tx.booking.update({
            where: { id: booking.id },
            data: { bookingId: `B${booking.id}` },
            include: { event: true, ticketType: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      //handle specific Prisma error
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Booking could not be completed because inventory changed; please retry',
        );
      }
      throw error;
    }
  }

  //retrieve all bookings for a specific attendee
  async findMine(attendeeId: number) {
    return this.prisma.booking.findMany({
      where: { attendeeId },
      include: { event: true, ticketType: true },
      orderBy: { time: 'desc' },
    });
  }
}
