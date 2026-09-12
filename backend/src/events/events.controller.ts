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

  @Post()
  @Roles('organizer')
  create(@Req() req: AuthedRequest, @Body() dto: CreateEventDto) {
    return this.eventsService.create(req.user!.userId, dto);
  }

  @Get('mine')
  @Roles('organizer')
  findMine(@Req() req: AuthedRequest) {
    return this.eventsService.findMine(req.user!.userId);
  }

  @Public()
  @Get('categories')
  findCategories() {
    return this.eventsService.findCategories();
  }

  @Public()
  @Get()
  search(@Query() dto: SearchEventsDto) {
    return this.eventsService.search(dto);
  }

  @Public()
  @Get(':id/export.json')
  exportJson(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.eventsService.exportOneJson(
      id,
      req.user?.userId,
      req.user?.roles ?? [],
    );
  }

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

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.eventsService.findOnePublic(
      id,
      req.user?.userId,
      req.user?.roles ?? [],
    );
  }

  @Patch(':id')
  @Roles('organizer')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthedRequest,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, req.user!.userId, dto);
  }

  @Post(':id/publish')
  @Roles('organizer')
  publish(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.eventsService.publish(id, req.user!.userId);
  }

  @Post(':id/cancel')
  @Roles('organizer')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.eventsService.cancel(id, req.user!.userId);
  }

  @Delete(':id')
  @Roles('organizer')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.eventsService.remove(id, req.user!.userId);
  }
}
