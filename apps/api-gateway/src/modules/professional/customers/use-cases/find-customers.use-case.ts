import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatPhoneNumber } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';
import { FindCustomersDto } from '../dto/requests/find-customers.dto';

@Injectable()
export class FindCustomersUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute(
    { search, limit, page }: FindCustomersDto,
    currentUser: CurrentUser,
  ) {
    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 25;
    const skip = (pageNumber - 1) * pageSize;

    const where: any = {
      business: { slug: currentUser.current_selected_business_slug },
    };

    if (search?.trim()) {
      const s = search.trim();
      const terms = s.split(/\s+/);

      where.AND = [
        // AND de termos no nome (Person.name)
        ...terms.map((term) => ({
          person: {
            name: { contains: term, mode: 'insensitive' },
          },
        })),
        // Busca complementar por email/telefone (Person) OU sombras no vínculo
        {
          OR: [
            { person: { email: { contains: s, mode: 'insensitive' } } },
            { person: { phone: { contains: s, mode: 'insensitive' } } },
            { email: { contains: s, mode: 'insensitive' } }, // sombra no vínculo
            { phone: { contains: s, mode: 'insensitive' } }, // sombra no vínculo
          ],
        },
      ];
    }

    const [rows, totalCount] = await Promise.all([
      this.prisma.businessCustomer.findMany({
        where,
        orderBy: [{ person: { name: 'asc' } }],
        select: {
          id: true,
          notes: true,
          verified: true,
          // dados principais vêm da Person
          person: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profile_image: true,
            },
          },
        },
        skip,
        take: pageSize,
      }),
      this.prisma.businessCustomer.count({ where }),
    ]);

    const customers = rows.map((bc) => ({
      id: bc.id, // id do vínculo no negócio
      name: bc.person.name,
      email: bc.person.email,
      phone: formatPhoneNumber(bc.person.phone),
      verified: bc.verified,
      notes: bc.notes ?? undefined,
      profile_image: this.fileSystem.getPublicUrl({
        key: bc.person.profile_image,
      }),
    }));

    return {
      customers,
      totalCount,
      page: pageNumber,
      limit: pageSize,
      hasMorePages: totalCount > skip + pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }
}
