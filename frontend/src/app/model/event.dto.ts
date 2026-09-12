export interface CategoryDto {
  id: number;
  name: string;
}

export interface TicketTypeDto {
  id: number;
  ticketTypeId: string;
  eventId: number;
  name: string;
  price: string;
  quantity: number;
  available: number;
}

export interface PhotoDto {
  id: number;
  eventId: number;
  url: string;
}

export interface EventOrganizerDto {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED';

export interface EventDto {
  id: number;
  eventId: string;
  title: string;
  eventType: string;
  venue: string;
  address: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  status: EventStatus;
  description: string;
  organizerId: number;
  categories: CategoryDto[];
  ticketTypes: TicketTypeDto[];
  photos: PhotoDto[];
  organizer: EventOrganizerDto;
  bookings?: EventBookingSummaryDto[];
  _count?: { bookings: number };
}

export interface EventBookingSummaryDto {
  id: number;
  bookingId: string;
  numberOfTickets: number;
  totalCost: string;
  status: string;
  time: string;
  attendee: { id: number; username: string };
  ticketType: TicketTypeDto;
}

export interface TicketTypeInput {
  ticketTypeId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateEventInput {
  title: string;
  eventType: string;
  venue: string;
  address: string;
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  description: string;
  categories: string[];
  ticketTypes: TicketTypeInput[];
  photos?: string[];
}

export interface SearchEventsParams {
  category?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  city?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchEventsResult {
  items: EventDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
