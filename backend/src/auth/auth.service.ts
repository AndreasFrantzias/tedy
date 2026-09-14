import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './jwt.payload';
import { RegisterDto } from './dto/register.dto';
import { UserStatus } from '../generated/prisma/client.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Εγγραφή νέου χρήστη
  async register(registerDto: RegisterDto) {
    // Έλεγχος ότι τα passwords ταιριάζουν
    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const { confirmPassword, password, ...rest } = registerDto;
    // Hash του password με bcrypt
    const passwordHash = await bcrypt.hash(password, 10);
    // Δημιουργία χρήστη με προεπιλεγμένους ρόλους
    return this.usersService.create({ ...rest, passwordHash });
  }

  // Επικύρωση των credentials
  async validateUser(username: string, password: string) {
    const user = await this.usersService.findInternalByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Ο χρήστης πρέπει να έχει εγκριθεί από admin
    if (user.status !== 'APPROVED') {
      throw new UnauthorizedException(
        'Your registration is pending administrator approval',
      );
    }
    return user;
  }

  // Login: δημιουργία JWT
  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roles: user.roles,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  // Αλλαγή κατάστασης εγγραφής (APPROVED, REJECTED, PENDING)
  async setApprovalStatus(userId: number, status: UserStatus) {
    return this.usersService.setStatus(userId, status);
  }
}
