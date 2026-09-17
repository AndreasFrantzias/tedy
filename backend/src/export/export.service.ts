import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { escapeXml } from '../common/xml';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  // Φορτώνει όλα τα events μαζί με τις σχετικές σχέσεις
  private async loadEvents() {
    return this.prisma.event.findMany({
      include: {
        categories: true,
        ticketTypes: true,
        photos: true,
        organizer: { select: { username: true } },
        bookings: {
          include: {
            attendee: { select: { username: true } },
            ticketType: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  // Μετατροπή σε JSON
  async toJson() {
    const events = await this.loadEvents();
    return {
      Events: events.map((e) => ({
        EventID: e.eventId,
        Title: e.title,
        Category: e.categories.map((c) => c.name),
        EventType: e.eventType,
        Venue: e.venue,
        Address: e.address,
        City: e.city,
        Country: e.country,
        GeoLocation:
          e.lat !== null && e.lng !== null
            ? { Latitude: e.lat, Longitude: e.lng }
            : undefined,
        StartDateTime: e.startDateTime.toISOString(),
        EndDateTime: e.endDateTime.toISOString(),
        Capacity: e.capacity,
        TicketTypes: e.ticketTypes.map((t) => ({
          TicketTypeID: t.ticketTypeId,
          Name: t.name,
          Price: Number(t.price),
          Quantity: t.quantity,
          Available: t.available,
        })),
        Bookings: e.bookings.map((b) => ({
          BookingID: b.bookingId,
          Attendee: { UserID: b.attendee.username },
          Time: b.time.toISOString(),
          TicketTypeRef: b.ticketType.ticketTypeId,
          NumberOfTickets: b.numberOfTickets,
          TotalCost: Number(b.totalCost),
          BookingStatus: b.status,
        })),
        Organizer: { UserID: e.organizer.username },
        Status: e.status,
        Description: e.description,
        Media: e.photos.map((p) => p.url),
      })),
    };
  }

  // Μετατροπή σε XML
  async toXml(): Promise<string> {
    const events = await this.loadEvents();
    const esc = (v: string) => escapeXml(v);

    const eventsXml = events
      .map((e) => {
        const categories = e.categories
          .map((c) => `    <Category>${esc(c.name)}</Category>`)
          .join('\n');

        const geoLocation =
          e.lat !== null && e.lng !== null
            ? `    <GeoLocation Latitude="${e.lat}" Longitude="${e.lng}"/>\n`
            : '';

        const ticketTypes = e.ticketTypes
          .map(
            (t) => `      <TicketType TicketTypeID="${esc(t.ticketTypeId)}">
        <Name>${esc(t.name)}</Name>
        <Price>${Number(t.price).toFixed(2)}</Price>
        <Quantity>${t.quantity}</Quantity>
        <Available>${t.available}</Available>
      </TicketType>`,
          )
          .join('\n');

        const bookings = e.bookings
          .map(
            (b) => `      <Booking BookingID="${esc(b.bookingId)}">
        <Attendee UserID="${esc(b.attendee.username)}"/>
        <Time>${b.time.toISOString()}</Time>
        <TicketTypeRef>${esc(b.ticketType.ticketTypeId)}</TicketTypeRef>
        <NumberOfTickets>${b.numberOfTickets}</NumberOfTickets>
        <TotalCost>${Number(b.totalCost).toFixed(2)}</TotalCost>
        <BookingStatus>${esc(b.status)}</BookingStatus>
      </Booking>`,
          )
          .join('\n');

        const media =
          e.photos.length > 0
            ? `    <Media>\n${e.photos
                .map((p) => `      <Photo>${esc(p.url)}</Photo>`)
                .join('\n')}\n    </Media>\n`
            : '';

        return `  <Event EventID="${esc(e.eventId)}">
    <Title>${esc(e.title)}</Title>
${categories}
    <EventType>${esc(e.eventType)}</EventType>
    <Venue>${esc(e.venue)}</Venue>
    <Address>${esc(e.address)}</Address>
    <City>${esc(e.city)}</City>
    <Country>${esc(e.country)}</Country>
${geoLocation}    <StartDateTime>${e.startDateTime.toISOString()}</StartDateTime>
    <EndDateTime>${e.endDateTime.toISOString()}</EndDateTime>
    <Capacity>${e.capacity}</Capacity>
    <TicketTypes>
${ticketTypes}
    </TicketTypes>
    <Bookings>
${bookings}
    </Bookings>
    <Organizer UserID="${esc(e.organizer.username)}"/>
    <Status>${esc(e.status)}</Status>
    <Description>${esc(e.description)}</Description>
${media}  </Event>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<Events>\n${eventsXml}\n</Events>\n`;
  }
}
