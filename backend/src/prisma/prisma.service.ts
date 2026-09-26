import 'dotenv/config';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    // Use the PrismaPg adapter for PostgreSQL
    const adapter = new PrismaPg({
      connectionString: process.env.DIRECT_DATABASE_URL as string,
    });
    super({ adapter });
  }

  // Close the database connection when the module is destroyed
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
