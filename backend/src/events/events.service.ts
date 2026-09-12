import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SearchEventsDto } from './dto/search-events.dto';
import { Prisma } from '../generated/prisma/client.js';

const EVENT_INCLUDE = {
  categories: true,
  ticketTypes: true,
  photos: true,
  organizer: {
    select: { id: true, username: true, firstName: true, lastName: true },
  },
} as const;

type EventTx = Prisma.TransactionClient;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertCapacity(
    capacity: number,
    ticketTypes: { quantity: number }[],
  ) {
    const totalQuantity = ticketTypes.reduce((sum, t) => sum + t.quantity, 0);
    if (totalQuantity > capacity) {
      throw new BadRequestException(
        `Total ticket quantity (${totalQuantity}) exceeds event capacity (${capacity})`,
      );
    }
  }

  private assertDateRange(
    startDateTime: string | Date,
    endDateTime: string | Date,
  ) {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      throw new BadRequestException(
        'End date/time must be after start date/time',
      );
    }
  }

  private assertUniqueTicketTypeIds(ticketTypes: { ticketTypeId: string }[]) {
    const ids = ticketTypes.map((t) => t.ticketTypeId.trim());
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Ticket type IDs must be unique per event');
    }
  }

  private assertPriceRange(dto: SearchEventsDto) {
    if (
      dto.priceMin !== undefined &&
      dto.priceMax !== undefined &&
      dto.priceMin > dto.priceMax
    ) {
      throw new BadRequestException(
        'priceMin must be less than or equal to priceMax',
      );
    }
  }

  async create(organizerId: number, dto: CreateEventDto) {
    this.assertDateRange(dto.startDateTime, dto.endDateTime);
    this.assertUniqueTicketTypeIds(dto.ticketTypes);
    this.assertCapacity(dto.capacity, dto.ticketTypes);

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          eventId: 'PENDING',
          title: dto.title,
          eventType: dto.eventType,
          venue: dto.venue,
          address: dto.address,
          city: dto.city,
          country: dto.country,
          lat: dto.lat,
          lng: dto.lng,
          startDateTime: new Date(dto.startDateTime),
          endDateTime: new Date(dto.endDateTime),
          capacity: dto.capacity,
          description: dto.description,
          status: 'DRAFT',
          organizerId,
          categories: {
            connectOrCreate: dto.categories.map((name) => ({
              where: { name },
              create: { name },
            })),
          },
          ticketTypes: {
            create: dto.ticketTypes.map((t) => ({
              ticketTypeId: t.ticketTypeId,
              name: t.name,
              price: t.price,
              quantity: t.quantity,
              available: t.quantity,
            })),
          },
          photos: dto.photos
            ? { create: dto.photos.map((url) => ({ url })) }
            : undefined,
        },
      });

      return tx.event.update({
        where: { id: created.id },
        data: { eventId: `EV${created.id}` },
        include: EVENT_INCLUDE,
      });
    });

    return event;
  }

  private async findOwned(id: number, organizerId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { ticketTypes: true, _count: { select: { bookings: true } } },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You do not own this event');
    }
    return event;
  }

  private async findOwnedForUpdate(
    tx: EventTx,
    id: number,
    organizerId: number,
  ) {
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${id} FOR UPDATE`;
    const event = await tx.event.findUnique({
      where: { id },
      include: { ticketTypes: true, _count: { select: { bookings: true } } },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You do not own this event');
    }
    return event;
  }

  async update(id: number, organizerId: number, dto: UpdateEventDto) {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.findOwnedForUpdate(tx, id, organizerId);

      if (dto.startDateTime !== undefined || dto.endDateTime !== undefined) {
        this.assertDateRange(
          dto.startDateTime ?? event.startDateTime,
          dto.endDateTime ?? event.endDateTime,
        );
      }

      if (dto.capacity !== undefined) {
        const booked = await tx.booking.aggregate({
          where: { eventId: id, status: { not: 'CANCELLED' } },
          _sum: { numberOfTickets: true },
        });
        const bookedSeats = booked._sum.numberOfTickets ?? 0;
        if (dto.capacity < bookedSeats) {
          throw new BadRequestException(
            `Capacity cannot be lower than already booked seats (${bookedSeats})`,
          );
        }
        this.assertCapacity(dto.capacity, dto.ticketTypes ?? event.ticketTypes);
      }

      const data: Prisma.EventUpdateInput = {};
      if (dto.title !== undefined) data.title = dto.title;
      if (dto.eventType !== undefined) data.eventType = dto.eventType;
      if (dto.venue !== undefined) data.venue = dto.venue;
      if (dto.address !== undefined) data.address = dto.address;
      if (dto.city !== undefined) data.city = dto.city;
      if (dto.country !== undefined) data.country = dto.country;
      if (dto.lat !== undefined) data.lat = dto.lat;
      if (dto.lng !== undefined) data.lng = dto.lng;
      if (dto.startDateTime !== undefined)
        data.startDateTime = new Date(dto.startDateTime);
      if (dto.endDateTime !== undefined)
        data.endDateTime = new Date(dto.endDateTime);
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.capacity !== undefined) data.capacity = dto.capacity;
      if (dto.categories !== undefined) {
        data.categories = {
          set: [],
          connectOrCreate: dto.categories.map((name) => ({
            where: { name },
            create: { name },
          })),
        };
      }

      if (dto.ticketTypes !== undefined) {
        if (event._count.bookings > 0) {
          throw new BadRequestException(
            'Cannot change ticket types after bookings have been made',
          );
        }
        this.assertUniqueTicketTypeIds(dto.ticketTypes);
        const capacity = dto.capacity ?? event.capacity;
        this.assertCapacity(capacity, dto.ticketTypes);
        await tx.ticketType.deleteMany({ where: { eventId: id } });
        data.ticketTypes = {
          create: dto.ticketTypes.map((t) => ({
            ticketTypeId: t.ticketTypeId,
            name: t.name,
            price: t.price,
            quantity: t.quantity,
            available: t.quantity,
          })),
        };
      }

      if (dto.photos !== undefined) {
        data.photos = {
          deleteMany: {},
          create: dto.photos.map((url) => ({ url })),
        };
      }

      return tx.event.update({
        where: { id },
        data,
        include: EVENT_INCLUDE,
      });
    });
  }

  async publish(id: number, organizerId: number) {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.findOwnedForUpdate(tx, id, organizerId);
      if (event.status !== 'DRAFT') {
        throw new BadRequestException('Only draft events can be published');
      }
      if (event.ticketTypes.length === 0) {
        throw new BadRequestException(
          'Event must have at least one ticket type',
        );
      }
      return tx.event.update({
        where: { id },
        data: { status: 'PUBLISHED' },
        include: EVENT_INCLUDE,
      });
    });
  }

  async cancel(id: number, organizerId: number) {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.findOwnedForUpdate(tx, id, organizerId);
      if (event.status !== 'PUBLISHED') {
        throw new BadRequestException('Only published events can be cancelled');
      }
      return tx.event.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: EVENT_INCLUDE,
      });
    });
  }

  async remove(id: number, organizerId: number) {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.findOwnedForUpdate(tx, id, organizerId);
      if (event._count.bookings > 0) {
        throw new BadRequestException(
          'Cannot delete an event that already has bookings',
        );
      }
      await tx.event.delete({ where: { id } });
      return { deleted: true };
    });
  }

  async findMine(organizerId: number) {
    return this.prisma.event.findMany({
      where: { organizerId },
      include: {
        ...EVENT_INCLUDE,
        bookings: {
          include: {
            attendee: { select: { id: true, username: true } },
            ticketType: true,
          },
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async search(dto: SearchEventsDto) {
    this.assertPriceRange(dto);
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 12;

    const where: Prisma.EventWhereInput = {
      status: 'PUBLISHED',
    };

    if (dto.category) {
      where.categories = { some: { name: dto.category } };
    }
    if (dto.q) {
      where.OR = [
        { title: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
      ];
    }
    if (dto.city) {
      where.city = { contains: dto.city, mode: 'insensitive' };
    }
    if (dto.dateFrom || dto.dateTo) {
      where.startDateTime = {
        ...(dto.dateFrom ? { gte: new Date(dto.dateFrom) } : {}),
        ...(dto.dateTo ? { lte: new Date(dto.dateTo) } : {}),
      };
    }
    if (dto.priceMin !== undefined || dto.priceMax !== undefined) {
      where.ticketTypes = {
        some: {
          price: {
            ...(dto.priceMin !== undefined ? { gte: dto.priceMin } : {}),
            ...(dto.priceMax !== undefined ? { lte: dto.priceMax } : {}),
          },
        },
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        include: EVENT_INCLUDE,
        orderBy: { startDateTime: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOnePublic(id: number, viewerId?: number, roles: string[] = []) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: EVENT_INCLUDE,
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    const canViewNonPublished =
      roles.includes('admin') ||
      (viewerId !== undefined && event.organizerId === viewerId);
    if (event.status !== 'PUBLISHED' && !canViewNonPublished) {
      throw new NotFoundException('Event not found');
    }
    if (viewerId) {
      await this.prisma.eventView.create({
        data: { userId: viewerId, eventId: id },
      });
    }
    return event;
  }

  async exportOneJson(id: number, viewerId?: number, roles: string[] = []) {
    const event = await this.findOnePublic(id, viewerId, roles);
    return {
      EventID: event.eventId,
      Title: event.title,
      Category: event.categories.map((c) => c.name),
      EventType: event.eventType,
      Venue: event.venue,
      Address: event.address,
      City: event.city,
      Country: event.country,
      GeoLocation:
        event.lat !== null && event.lng !== null
          ? { Latitude: event.lat, Longitude: event.lng }
          : undefined,
      StartDateTime: event.startDateTime.toISOString(),
      EndDateTime: event.endDateTime.toISOString(),
      Capacity: event.capacity,
      TicketTypes: event.ticketTypes.map((t) => ({
        TicketTypeID: t.ticketTypeId,
        Name: t.name,
        Price: Number(t.price),
        Quantity: t.quantity,
        Available: t.available,
      })),
      Organizer: { UserID: event.organizer.username },
      Status: event.status,
      Description: event.description,
      Media: event.photos.map((p) => p.url),
    };
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async exportOneXml(id: number, viewerId?: number, roles: string[] = []) {
    const event = await this.exportOneJson(id, viewerId, roles);
    const esc = (value: string) => this.escapeXml(value);
    const categories = event.Category.map(
      (category) => `    <Category>${esc(category)}</Category>`,
    ).join('\n');
    const geoLocation = event.GeoLocation
      ? `    <GeoLocation Latitude="${event.GeoLocation.Latitude}" Longitude="${event.GeoLocation.Longitude}"/>\n`
      : '';
    const ticketTypes = event.TicketTypes.map(
      (
        ticketType,
      ) => `      <TicketType TicketTypeID="${esc(ticketType.TicketTypeID)}">
        <Name>${esc(ticketType.Name)}</Name>
        <Price>${ticketType.Price.toFixed(2)}</Price>
        <Quantity>${ticketType.Quantity}</Quantity>
        <Available>${ticketType.Available}</Available>
      </TicketType>`,
    ).join('\n');
    const media =
      event.Media.length > 0
        ? `    <Media>\n${event.Media.map((url) => `      <Photo>${esc(url)}</Photo>`).join('\n')}\n    </Media>\n`
        : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
  <Event EventID="${esc(event.EventID)}">
    <Title>${esc(event.Title)}</Title>
${categories}
    <EventType>${esc(event.EventType)}</EventType>
    <Venue>${esc(event.Venue)}</Venue>
    <Address>${esc(event.Address)}</Address>
    <City>${esc(event.City)}</City>
    <Country>${esc(event.Country)}</Country>
${geoLocation}    <StartDateTime>${event.StartDateTime}</StartDateTime>
    <EndDateTime>${event.EndDateTime}</EndDateTime>
    <Capacity>${event.Capacity}</Capacity>
    <TicketTypes>
${ticketTypes}
    </TicketTypes>
    <Organizer UserID="${esc(event.Organizer.UserID)}"/>
    <Status>${esc(event.Status)}</Status>
    <Description>${esc(event.Description)}</Description>
${media}  </Event>
`;
  }
}
