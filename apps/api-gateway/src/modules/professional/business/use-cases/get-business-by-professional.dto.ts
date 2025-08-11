import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { getInitials } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetBusinessByProfessionalUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(currentUser: CurrentUser) {
    const { id: accountId } = currentUser; // id da AuthAccount

    const businesses = await this.prisma.business.findMany({
      where: {
        is_active: true,
        professionals: {
          some: {
            // ProfessionalProfile -> Person -> PersonAccount -> AuthAccount(id)
            person: {
              personAccount: {
                authAccountId: accountId,
              },
            },
          },
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        logo: true,
      },
    });

    return businesses.map((b) => ({
      ...b,
      initials: getInitials(b.name),
    }));
  }
}
