import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';

interface AuthedRequest extends Request {
  user?: { userId: number; username: string; roles: string[] };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  findMe(@Req() req: AuthedRequest) {
    return this.usersService.findMe(req.user!.userId);
  }

  @Get('pending')
  @Roles('admin')
  findPending() {
    return this.usersService.findByStatus('PENDING');
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/approve')
  @Roles('admin')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.setStatus(id, 'APPROVED');
  }

  @Patch(':id/reject')
  @Roles('admin')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.setStatus(id, 'REJECTED');
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
