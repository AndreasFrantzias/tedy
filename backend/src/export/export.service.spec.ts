import { ExportService } from './export.service';

describe('ExportService', () => {
  it('escapes XML values in exported events', async () => {
    const prisma = {
      event: {
        findMany: jest.fn().mockResolvedValue([
          {
            eventId: 'EV&1',
            title: 'Rock & Roll <Live>',
            categories: [{ name: 'Music' }],
            eventType: 'Concert',
            venue: 'Hall',
            address: 'Main',
            city: 'Athens',
            country: 'Greece',
            lat: null,
            lng: null,
            startDateTime: new Date('2026-07-01T20:00:00.000Z'),
            endDateTime: new Date('2026-07-01T22:00:00.000Z'),
            capacity: 10,
            ticketTypes: [],
            bookings: [],
            organizer: { username: 'org' },
            status: 'DRAFT',
            description: 'A <great> show & more',
            photos: [],
          },
        ]),
      },
    };
    const service = new ExportService(prisma as never);

    const xml = await service.toXml();

    expect(xml).toContain('EventID="EV&amp;1"');
    expect(xml).toContain('Rock &amp; Roll &lt;Live&gt;');
    expect(xml).toContain('A &lt;great&gt; show &amp; more');
  });
});
