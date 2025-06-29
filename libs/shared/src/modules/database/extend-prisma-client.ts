import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { readReplicas } from '@prisma/extension-read-replicas';

function extendPrismaClient() {
  const logger = new Logger('Prisma');
  const prisma = new PrismaClient().$extends(
    readReplicas({
      url: process.env.DATABASE_URL,
    }),
  );
  return prisma.$extends({
    client: {
      async onModuleInit() {
        // Uncomment this to establish a connection on startup, this is generally not necessary
        // https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-management#connect
        // await Prisma.getExtensionContext(this).$connect();
      },
    },
    // query: {
    //   $allModels: {
    //     async $allOperations({ operation, model, args, query }) {
    //       const start = performance.now();
    //       const result = await query(args);
    //       const end = performance.now();
    //       const time = end - start;
    //       logger.debug(`${model}.${operation} took ${time}ms`);
    //       return result;
    //     },
    //   },
    // },
  });
}

// https://github.com/prisma/prisma/issues/18628
export const ExtendedPrismaClient = class {
  constructor() {
    return extendPrismaClient();
  }
} as new () => ReturnType<typeof extendPrismaClient>;
