import 'dotenv/config';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    // Χρήση του adapter για PostgreSQL
    const adapter = new PrismaPg({
      connectionString: process.env.DIRECT_DATABASE_URL as string,
    });
    super({ adapter });
  }

  // Κλεισίματος σύνδεσης όταν τερματίζεται το module
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
