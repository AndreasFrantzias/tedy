import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';
import { BroadcastMessageDto } from './dto/broadcast-message.dto';
import { Roles } from '../auth/roles.decorator';

interface AuthedRequest extends Request {
  user?: { userId: number; username: string; roles: string[] };
}

@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('inbox')
  @Roles('organizer', 'attendee')
  inbox(@Req() req: AuthedRequest) {
    return this.messagingService.inbox(req.user!.userId);
  }

  @Get('sent')
  @Roles('organizer', 'attendee')
  sent(@Req() req: AuthedRequest) {
    return this.messagingService.sent(req.user!.userId);
  }

  @Get('unread-count')
  @Roles('organizer', 'attendee')
  unreadCount(@Req() req: AuthedRequest) {
    return this.messagingService.unreadCount(req.user!.userId);
  }

  @Post()
  @Roles('organizer', 'attendee')
  send(@Req() req: AuthedRequest, @Body() dto: SendMessageDto) {
    return this.messagingService.send(req.user!.userId, dto);
  }

  @Post('broadcast/:eventId')
  @Roles('organizer')
  broadcast(
    @Req() req: AuthedRequest,
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() dto: BroadcastMessageDto,
  ) {
    return this.messagingService.broadcast(req.user!.userId, eventId, dto);
  }

  @Patch(':id/read')
  @Roles('organizer', 'attendee')
  markRead(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.messagingService.markRead(id, req.user!.userId);
  }

  @Delete(':id')
  @Roles('organizer', 'attendee')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.messagingService.remove(id, req.user!.userId);
  }
}
