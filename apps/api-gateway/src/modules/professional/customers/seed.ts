// @ts-nocheck
import { PrismaService } from '@app/shared';
import { formatDate } from '@app/shared/utils';
import { faker } from '@faker-js/faker';
import { Injectable, OnModuleInit } from '@nestjs/common';
// import type { Prisma } from '@prisma/client'; // opcional se quiser tipar o tx

type SeedCustomer = {
  name: string;
  phone: string;
  email: string;
  birthdate: string;
  notes: string;
};

@Injectable()
export class SeedCustomersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // await this.execute();
  }

  async execute(opts?: {
    businessId?: string;
    total?: number;
    chunkSize?: number;
  }) {
    const BUSINESS_ID = opts?.businessId ?? 'cmcflsng10000yx9j0tytkum8';
    const TOTAL = opts?.total ?? 200;
    const CHUNK = opts?.chunkSize ?? 50;

    const makePhone = () =>
      faker.phone
        .number({ style: 'international' })
        .replace(/[^\d]/g, '')
        .replace(/^55/, '55');

    const emails = new Set<string>();
    const customers: SeedCustomer[] = [];

    while (customers.length < TOTAL) {
      const name = faker.person.fullName();
      const email = faker.internet
        .email({ firstName: name.split(' ')[0] })
        .toLowerCase();
      if (emails.has(email)) continue;
      emails.add(email);

      customers.push({
        name,
        phone: makePhone(),
        email,
        birthdate: formatDate(
          faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
          'yyyy-MM-dd',
        ),
        notes: faker.lorem.paragraphs(2, '\n\n'),
      });
    }

    for (let i = 0; i < customers.length; i += CHUNK) {
      const slice = customers.slice(i, i + CHUNK);

      // ✅ usa o overload callback; dentro dele chamamos a versão "Tx" que retorna Promise<void>
      await this.prisma.$transaction(async (tx) => {
        // sequencial (mais seguro contra deadlocks). Se quiser, limite a concorrência manualmente.
        for (const c of slice) {
          await this.seedOneTx(tx, BUSINESS_ID, c);
        }
      });
    }

    console.log(
      `Seeded ${customers.length} business contacts (with persons & customer profiles).`,
    );
  }

  // ✅ versão que trabalha com TransactionClient
  private async seedOneTx(
    tx: PrismaService['$transaction'] extends (
      fn: infer Fn,
      ...args: any
    ) => any
      ? Parameters<Fn>[0] extends (client: infer Client) => any
        ? Client
        : never
      : never,
    businessId: string,
    c: SeedCustomer,
  ): Promise<void> {
    // 1) Person
    const person = await tx.person.upsert({
      where: { email: c.email },
      update: { name: c.name, phone: c.phone },
      create: { name: c.name, phone: c.phone, email: c.email },
      select: { id: true },
    });

    // 2) CustomerProfile
    const customerProfile = await tx.customerProfile.upsert({
      where: { personId: person.id },
      update: { birthdate: c.birthdate },
      create: { personId: person.id, birthdate: c.birthdate },
      select: { id: true },
    });

    // 3) BusinessContact (unique por (businessId, phone))
    await tx.businessContact.upsert({
      where: {
        uniq_contact_business_phone: {
          businessId,
          phone: c.phone,
        },
      },
      update: {
        name: c.name,
        email: c.email,
        notes: c.notes,
        verified: false,
        customerId: customerProfile.id,
      },
      create: {
        businessId,
        customerId: customerProfile.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        verified: false,
      },
      select: { businessId: true },
    });
  }
}
