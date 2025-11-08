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
          order: 1,
          icon_path:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/dark/barbearia.png',
          icon_path_light:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/light/barbearia.png',
        },
        {
          name: 'Salão de Beleza',
          order: 2,
          icon_path:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/dark/salao-beleza.png',
          icon_path_light:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/light/salao-beleza.png',
        },
        {
          name: 'Estética',
          order: 3,
          icon_path:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/dark/cilios-sobrancelha.png',
          icon_path_light:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/light/cilios-sobrancelha.png',
        },
        {
          name: 'Fitness',
          order: 4,
          icon_path:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/dark/esporte-movimento.png',
          icon_path_light:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/light/esporte-movimento.png',
        },
        {
          name: 'Saúde & Bem-estar',
          order: 5,
          icon_path:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/dark/saude-bem-estar.png',
          icon_path_light:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/light/saude-bem-estar.png',
        },
        {
          name: 'Esportes & Movimento',
          order: 6,
          icon_path:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/dark/esporte-movimento.png',
          icon_path_light:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/light/esporte-movimento.png',
        },
        {
          name: 'Outro',
          order: 7,
          icon_path:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/dark/others.png',
          icon_path_light:
            'https://api-minio.innovatecode.online/marquei/business-category-icons/light/others.png',
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
