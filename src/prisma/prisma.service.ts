import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
// Prisma 7's "prisma-client" generator writes the client outside node_modules,
// so it's imported from the generated path (set by `output` in schema.prisma)
// instead of the old '@prisma/client' package.
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Prisma 7 dropped the Rust query engine in favor of driver adapters,
    // so a PrismaPg adapter must be passed in explicitly.
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
