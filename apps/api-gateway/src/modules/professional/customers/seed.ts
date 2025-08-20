import { PrismaService } from '@app/shared';
import { formatDate } from '@app/shared/utils';
import { faker } from '@faker-js/faker';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SeedCustomersService implements OnModuleInit {
  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    // await this.execute();
  }

  async execute() {
    const customers = Array.from({ length: 200 }).map(() => ({
      name: faker.person.fullName(),
      phone: faker.phone.number({ style: 'national' }),
      email: faker.internet.email(),
      businessId: 'cmcflsng10000yx9j0tytkum8',
      birthdate: formatDate(
        faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
        'yyyy-MM-dd',
      ),
      notes: faker.lorem.paragraphs(2, '\n\n'),
    }));

    // await this.prismaService.customer.createMany({
    //   data: customers,
    //   skipDuplicates: true,
    // });

    console.log(`Seeded ${customers.length} customers.`);
  }
}
