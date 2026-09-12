import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client.js';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates pending users with organizer and attendee roles', async () => {
    prisma.user.create.mockResolvedValue({
      id: 1,
      username: 'newuser',
      email: 'new@example.com',
      roles: ['organizer', 'attendee'],
      status: 'PENDING',
      firstName: 'New',
      lastName: 'User',
      phone: '1',
      address: 'A',
      city: 'Athens',
      country: 'Greece',
      lat: null,
      lng: null,
      afm: '123',
    });

    await service.create({
      username: 'newuser',
      email: 'new@example.com',
      passwordHash: 'hash',
      firstName: 'New',
      lastName: 'User',
      phone: '1',
      address: 'A',
      city: 'Athens',
      country: 'Greece',
      afm: '123',
    });

    const calls = prisma.user.create.mock.calls as Array<
      [{ data: { roles: string[]; status: string } }]
    >;
    const createCall = calls[0][0];
    expect(createCall.data.roles).toEqual(['organizer', 'attendee']);
    expect(createCall.data.status).toBe('PENDING');
  });

  it('maps duplicate username/email to conflict', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create({
        username: 'dupe',
        email: 'dupe@example.com',
        passwordHash: 'hash',
        firstName: 'Dupe',
        lastName: 'User',
        phone: '1',
        address: 'A',
        city: 'Athens',
        country: 'Greece',
        afm: '123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
