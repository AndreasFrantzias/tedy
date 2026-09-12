import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  Prisma,
  User as DbUser,
  UserStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { PublicUserDto } from './dto/public-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<PublicUserDto> {
    try {
      const user = await this.prisma.user.create({
        data: {
          ...createUserDto,
          roles: ['organizer', 'attendee'],
          status: 'PENDING',
        },
      });
      return this.toPublicUser(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(): Promise<PublicUserDto[]> {
    const users = await this.prisma.user.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
    });
    return users.map((user) => this.toPublicUser(user, true));
  }

  async findByStatus(status: UserStatus): Promise<PublicUserDto[]> {
    const users = await this.prisma.user.findMany({
      where: { active: true, status },
      orderBy: { id: 'asc' },
    });
    return users.map((user) => this.toPublicUser(user, true));
  }

  async findOne(id: number): Promise<PublicUserDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, active: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toPublicUser(user, true);
  }

  async setStatus(id: number, status: UserStatus): Promise<PublicUserDto> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { status },
      });
      return this.toPublicUser(user, true);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number): Promise<PublicUserDto> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { active: false },
      });
      return this.toPublicUser(user, true);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findMe(id: number): Promise<PublicUserDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, active: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toPublicUser(user, true);
  }

  private toPublicUser(user: DbUser, includeSensitive = false): PublicUserDto {
    const dto: PublicUserDto = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    if (includeSensitive) {
      dto.phone = user.phone;
      dto.address = user.address;
      dto.city = user.city;
      dto.country = user.country;
      dto.lat = user.lat;
      dto.lng = user.lng;
      dto.afm = user.afm;
    }
    return dto;
  }

  async findInternalByUsername(username: string): Promise<DbUser | null> {
    return this.prisma.user.findFirst({
      where: { username, active: true },
    });
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Username or email already exists');
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('User not found');
    }
    throw error;
  }
}
