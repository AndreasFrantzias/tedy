import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Patch('users/:id/approve')
  @Roles('admin')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.authService.setApprovalStatus(id, 'APPROVED');
  }

  @Patch('users/:id/reject')
  @Roles('admin')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.authService.setApprovalStatus(id, 'REJECTED');
  }
}
