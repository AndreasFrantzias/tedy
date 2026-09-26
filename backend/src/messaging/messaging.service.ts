import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { BroadcastMessageDto } from './dto/broadcast-message.dto';

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  async inbox(userId: number) {
    return this.prisma.message.findMany({
      //only fetch messages that are not deleted by the recipient
      where: { recipientId: userId, deletedByRecipient: false },
      include: {
        sender: { select: { id: true, username: true } },
        event: true,
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  async sent(userId: number) {
    return this.prisma.message.findMany({
      //only fetch messages that are not deleted by the sender
      where: { senderId: userId, deletedBySender: false },
      include: {
        recipient: { select: { id: true, username: true } },
        event: true,
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  async unreadCount(userId: number) {
    const count = await this.prisma.message.count({
      //only fetch unread messages that are not deleted and not read by the recipient
      where: { recipientId: userId, deletedByRecipient: false, readAt: null },
    });
    return { count };
  }

  //checks if two users have bookingrelationship
  private async hasBookingRelationship(
    userIdA: number,
    userIdB: number,
    eventId?: number,
  ): Promise<boolean> {
    const count = await this.prisma.booking.count({
      //check if userIdA is the attendee and userIdB is the organizer or vice versa
      where: {
        //ignore eventId if not provided, otherwise filter by eventId
        ...(eventId ? { eventId } : {}),
        status: 'CONFIRMED',
        OR: [
          { attendeeId: userIdA, event: { organizerId: userIdB } },
          { attendeeId: userIdB, event: { organizerId: userIdA } },
        ],
      },
    });
    return count > 0;
  }

  async send(senderId: number, dto: SendMessageDto) {
    // Prevent users from messaging themselves
    if (senderId === dto.recipientId) {
      throw new BadRequestException('Cannot message yourself');
    }
    //check if recipient exists and is active and approved
    const recipient = await this.prisma.user.findFirst({
      where: { id: dto.recipientId, active: true, status: 'APPROVED' },
    });
    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }
    const allowed = await this.hasBookingRelationship(
      senderId,
      dto.recipientId,
      dto.eventId,
    );
    if (!allowed) {
      throw new ForbiddenException(
        'Messaging is only available between an organizer and an attendee who has booked one of their events',
      );
    }
    //create message
    return this.prisma.message.create({
      data: {
        senderId,
        recipientId: dto.recipientId,
        eventId: dto.eventId,
        subject: dto.subject,
        body: dto.body,
      },
    });
  }

  //Broadcast message to all attendees of an event
  async broadcast(
    organizerId: number,
    eventId: number,
    dto: BroadcastMessageDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You do not own this event');
    }
    //get all bookings of event that are confirmed and distinct by attendeeId
    const bookings = await this.prisma.booking.findMany({
      where: { eventId, status: 'CONFIRMED' },
      distinct: ['attendeeId'],
      select: { attendeeId: true },
    });
    if (bookings.length === 0) {
      return { sent: 0 };
    }
    //create messages for all attendees of the event
    await this.prisma.message.createMany({
      data: bookings.map((b) => ({
        senderId: organizerId,
        recipientId: b.attendeeId,
        eventId,
        subject: dto.subject,
        body: dto.body,
      })),
    });
    return { sent: bookings.length };
  }

  async markRead(id: number, userId: number) {
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.recipientId !== userId) {
      throw new ForbiddenException('You are not the recipient of this message');
    }
    //updarte readAt timestamp to current time
    return this.prisma.message.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async remove(id: number, userId: number) {
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== userId && message.recipientId !== userId) {
      throw new ForbiddenException('You are not part of this message');
    }

    //flag message as deleted by sender or recipient by how is deleting it
    const deletedBySender =
      message.senderId === userId ? true : message.deletedBySender;
    const deletedByRecipient =
      message.recipientId === userId ? true : message.deletedByRecipient;

    // If both sender and recipient have deleted the message, remove it from the database
    if (deletedBySender && deletedByRecipient) {
      await this.prisma.message.delete({ where: { id } });
      return { deleted: true };
    }
    return this.prisma.message.update({
      where: { id },
      data: { deletedBySender, deletedByRecipient },
    });
  }
}
