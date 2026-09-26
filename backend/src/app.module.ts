import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { BookingsModule } from './bookings/bookings.module';
import { MessagingModule } from './messaging/messaging.module';
import { ExportModule } from './export/export.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    AuthModule,
    EventsModule,
    BookingsModule,
    MessagingModule,
    ExportModule,
    RecommendationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    //global guards for JWT authentication and role-based access control
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
