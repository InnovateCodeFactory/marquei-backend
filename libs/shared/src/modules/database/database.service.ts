import { Injectable } from '@nestjs/common';
import { ExtendedPrismaClient } from './extend-prisma-client';

@Injectable()
export class PrismaService extends ExtendedPrismaClient {
  // constructor() {
  //   super({
  //     log: ['query', 'info', 'warn', 'error'],
  //     errorFormat: 'pretty',
  //   });
  // }
  // async onModuleInit() {
  //   try {
  //     await this.$connect();
  //   } catch (error) {
  //     console.error('Erro ao conectar com o banco de dados:', error);
  //     setInterval(async () => await this.$connect(), 1000 * 5);
  //   }
  // }
}
