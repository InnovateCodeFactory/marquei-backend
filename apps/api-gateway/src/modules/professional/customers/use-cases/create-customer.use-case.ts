import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateCustomerDto } from '../dto/requests/create-customer.dto';

@Injectable()
export class CreateCustomerUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(payload: CreateCustomerDto, currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_slug)
      throw new BadRequestException('Nenhum negócio selecionado');

    const { current_selected_business_slug: slug } = currentUser;

    // 1) Checa duplicidade de contato no negócio (único por telefone)
    const contactExists = await this.prisma.businessContact.findFirst({
      where: {
        phone: payload.phone,
        business: { slug },
      },
      select: { id: true },
    });

    if (contactExists)
      throw new ConflictException('Cliente já cadastrado com este telefone');

    // 2) Resolve o negócio
    const business = await this.prisma.business.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!business) throw new BadRequestException('Negócio inválido');

    // 3) Cria (ou reutiliza) Person/CustomerProfile e vincula BusinessContact
    await this.prisma.$transaction(async (tx) => {
      // Tenta achar Person por e-mail (se houver). Telefone não é único globalmente.
      let person = payload.email
        ? await tx.person.findUnique({ where: { email: payload.email } })
        : null;

      if (!person) {
        person = await tx.person.create({
          data: {
            name: payload.name,
            phone: payload.phone,
            email: payload.email ?? null,
          },
        });
      }

      // CustomerProfile 1:1 com Person
      let customerProfile = await tx.customerProfile.findUnique({
        where: { personId: person.id },
        select: { id: true },
      });
      if (!customerProfile) {
        customerProfile = await tx.customerProfile.create({
          data: {
            personId: person.id,
            birthdate: payload.birthdate ?? null,
          },
          select: { id: true },
        });
      }

      // Contato local do negócio
      await tx.businessContact.create({
        data: {
          businessId: business.id,
          customerId: customerProfile.id,
          name: payload.name,
          phone: payload.phone,
          email: payload.email ?? null,
          notes: payload.notes ?? null,
          verified: false,
        },
        select: { id: true },
      });
    });

    return null;
  }
}
