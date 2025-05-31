import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // constructor() {
  //   super({
  //     log: ['query', 'info', 'warn', 'error'],
  //     errorFormat: 'pretty',
  //   });
  // }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.error('Erro ao conectar com o banco de dados:', error);
      setInterval(async () => await this.$connect(), 1000 * 5);
    }
  }
}
