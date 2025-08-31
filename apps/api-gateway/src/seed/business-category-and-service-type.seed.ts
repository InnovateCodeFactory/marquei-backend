import { PrismaService } from '@app/shared';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class BusinessCategoryAndServiceTypeSeed implements OnModuleInit {
  private readonly logger = new Logger(BusinessCategoryAndServiceTypeSeed.name);
  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    // await Promise.all([
    //   this.createBusinessCategories(),
    //   this.createBusinessServiceTypes(),
    // ]);
  }

  async createBusinessCategories() {
    await this.prismaService.businessCategory.createMany({
      data: [
        {
          name: 'Barbearia',
        },
        {
          name: 'Salão de Beleza',
        },
        {
          name: 'Estética',
        },
        {
          name: 'Fitness',
        },
        {
          name: 'Saúde & Bem-estar',
        },
        {
          name: 'Esportes & Movimento',
        },
      ],
    });
    this.logger.debug('Business categories created');
  }

  async createBusinessServiceTypes() {
    await this.prismaService.businessServiceType.createMany({
      data: [
        {
          name: 'Presencial',
        },
        {
          name: 'Domiciliar',
        },
        {
          name: 'Online',
        },
        {
          name: 'Presencial e domiciliar',
        },
        {
          name: 'Presencial e online',
        },
      ],
    });

    this.logger.debug('Business service types created');
  }
}
