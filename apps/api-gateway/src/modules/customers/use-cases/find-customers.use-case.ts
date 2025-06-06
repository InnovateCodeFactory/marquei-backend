import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FindCustomersUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(currentUser: CurrentUser) {
    const customers = await this.prismaService.customer.findMany({
      where: {
        business: {
          slug: currentUser.current_selected_business_slug,
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    return customers;
  }
}
