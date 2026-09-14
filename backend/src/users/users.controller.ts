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

  // Λήψη όλων των χρηστών (admin)
  @Get()
  @Roles('admin')
  findAll() {
    return this.usersService.findAll();
  }

  // Λήψη του τρέχοντος χρήστη
  @Get('me')
  findMe(@Req() req: AuthedRequest) {
    return this.usersService.findMe(req.user!.userId);
  }

  // Λήψη pending χρηστών (admin)
  @Get('pending')
  @Roles('admin')
  findPending() {
    return this.usersService.findByStatus('PENDING');
  }

  // Λήψη συγκεκριμένου χρήστη (admin)
  @Get(':id')
  @Roles('admin')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // Έγκριση χρήστη (admin)
  @Patch(':id/approve')
  @Roles('admin')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.setStatus(id, 'APPROVED');
  }

  // Απόρριψη χρήστη (admin)
  @Patch(':id/reject')
  @Roles('admin')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.setStatus(id, 'REJECTED');
  }

  // Διαγραφή χρήστη (admin)
  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
