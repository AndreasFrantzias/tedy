import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Roles } from '../auth/roles.decorator';

interface AuthedRequest extends Request {
  user?: { userId: number; username: string; roles: string[] };
}

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Δημιουργία νέας κράτησης (μόνο συμμετέχων)
  @Post()
  @Roles('attendee')
  create(@Req() req: AuthedRequest, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(req.user!.userId, dto);
  }

  // Λήψη όλων των κρατήσεων του χρήστη
  @Get('mine')
  @Roles('attendee')
  findMine(@Req() req: AuthedRequest) {
    return this.bookingsService.findMine(req.user!.userId);
  }
}
