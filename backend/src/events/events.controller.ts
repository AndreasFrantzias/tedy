import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SearchEventsDto } from './dto/search-events.dto';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';

interface AuthedRequest extends Request {
  user?: { userId: number; username: string; roles: string[] };
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  //Creation of a new event (only for organizers)
  @Post()
  @Roles('organizer')
  create(@Req() req: AuthedRequest, @Body() dto: CreateEventDto) {
    return this.eventsService.create(req.user!.userId, dto);
  }

  // Get all events of the user (only for organizers)
  @Get('mine')
  @Roles('organizer')
  findMine(@Req() req: AuthedRequest) {
    return this.eventsService.findMine(req.user!.userId);
  }

  //Get all categories (public)
  @Public()
  @Get('categories')
  findCategories() {
    return this.eventsService.findCategories();
  }

  //search events (public)
  @Public()
  @Get()
  search(@Query() dto: SearchEventsDto) {
    return this.eventsService.search(dto);
  }

  //export to JSON (public, filter capability for admin)
  @Public()
  @Get(':id/export.json')
  exportJson(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.eventsService.exportOneJson(
      id,
      req.user?.userId,
      req.user?.roles ?? [],
    );
  }

  //export to XML
  @Public()
  @Get(':id/export.xml')
  @Header('Content-Type', 'application/xml')
  exportXml(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.eventsService.exportOneXml(
      id,
      req.user?.userId,
      req.user?.roles ?? [],
    );
  }

  // Get a single event (public)
  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.eventsService.findOnePublic(
      id,
      req.user?.userId,
      req.user?.roles ?? [],
    );
  }

  // Update event (only for organizers)
  @Patch(':id')
  @Roles('organizer')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthedRequest,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, req.user!.userId, dto);
  }

  // publish event (only for organizers)
  @Post(':id/publish')
  @Roles('organizer')
  publish(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.eventsService.publish(id, req.user!.userId);
  }

  //cancel event (only for organizers)
  @Post(':id/cancel')
  @Roles('organizer')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.eventsService.cancel(id, req.user!.userId);
  }

  // Delete event (only for organizers)
  @Delete(':id')
  @Roles('organizer')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.eventsService.remove(id, req.user!.userId);
  }
}
