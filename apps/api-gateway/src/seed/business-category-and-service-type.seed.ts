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
          id: 'cmhpoavwk0000yxgo14mnu7yl',
          name: 'Barbearia',
          description: null,
          order: 1,
          icon_path: 'business-category-icons/dark/barbearia.png',
          icon_path_light: 'business-category-icons/light/barbearia.png',
        },
        {
          id: 'cmhpoavwk0001yxgoqwipbqph',
          name: 'Salão de Beleza',
          description: null,
          order: 5,
          icon_path: 'business-category-icons/dark/salao-beleza.png',
          icon_path_light: 'business-category-icons/light/salao-beleza.png',
        },
        {
          id: 'cmhpoavwk0002yxgo6qv0ftcy',
          name: 'Estética',
          description: null,
          order: 2,
          icon_path: 'business-category-icons/dark/cilios-sobrancelha.png',
          icon_path_light:
            'business-category-icons/light/cilios-sobrancelha.png',
        },
        {
          id: 'cmhpoavwk0003yxgos9pcptqw',
          name: 'Fitness',
          description: null,
          order: 3,
          icon_path: 'business-category-icons/dark/esporte-movimento.png',
          icon_path_light:
            'business-category-icons/light/esporte-movimento.png',
        },
        {
          id: 'cmhpoavwk0004yxgocndkpioy',
          name: 'Saúde & Bem-estar',
          description: null,
          order: 4,
          icon_path: 'business-category-icons/dark/saude-bem-estar.png',
          icon_path_light: 'business-category-icons/light/saude-bem-estar.png',
        },
        {
          id: 'cmhpoavwk0005yxgovd6xqfti',
          name: 'Esportes & Movimento',
          description: null,
          order: 6,
          icon_path: 'business-category-icons/dark/esporte-movimento.png',
          icon_path_light:
            'business-category-icons/light/esporte-movimento.png',
        },
        {
          id: 'cmhpoavwk0006yxgo75ghffzb',
          name: 'Outro',
          description: null,
          order: 7,
          icon_path: 'business-category-icons/dark/others.png',
          icon_path_light: 'business-category-icons/light/others.png',
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
