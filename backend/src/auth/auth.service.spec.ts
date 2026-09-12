import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.setTimeout(15000);

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findInternalByUsername: jest.Mock; create: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    usersService = { findInternalByUsername: jest.fn(), create: jest.fn() };
    jwtService = { signAsync: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects pending users at login', async () => {
    usersService.findInternalByUsername.mockResolvedValue({
      id: 1,
      username: 'pending',
      passwordHash: await bcrypt.hash('password123', 10),
      roles: ['attendee'],
      status: 'PENDING',
    });

    await expect(
      service.login('pending', 'password123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('signs approved users with assignment roles', async () => {
    usersService.findInternalByUsername.mockResolvedValue({
      id: 1,
      username: 'approved',
      passwordHash: await bcrypt.hash('password123', 10),
      roles: ['organizer', 'attendee'],
      status: 'APPROVED',
    });
    jwtService.signAsync.mockResolvedValue('token');

    await expect(service.login('approved', 'password123')).resolves.toEqual({
      access_token: 'token',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 1,
      username: 'approved',
      roles: ['organizer', 'attendee'],
    });
  });
});
