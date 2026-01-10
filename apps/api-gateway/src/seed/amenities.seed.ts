import { PrismaService } from '@app/shared';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class AmenitiesSeed implements OnModuleInit {
  private readonly logger = new Logger(AmenitiesSeed.name);
  AMENITIES_SEED = [
    { title: 'Wi-Fi', type: 'wifi', icon: 'wifi', lib: 'MaterialIcons' },
    {
      title: 'Estacionamento',
      type: 'parking',
      icon: 'local-parking',
      lib: 'MaterialIcons',
    },
    {
      title: 'Estacionamento Gratuito',
      type: 'free_parking',
      icon: 'local-parking',
      lib: 'MaterialIcons',
    },
    {
      title: 'Ar-condicionado',
      type: 'air_conditioning',
      icon: 'ac-unit',
      lib: 'MaterialIcons',
    },
    {
      title: 'Ambiente Climatizado',
      type: 'climatized_environment',
      icon: 'thermostat',
      lib: 'MaterialIcons',
    },
    {
      title: 'Acessibilidade',
      type: 'accessibility',
      icon: 'accessible',
      lib: 'MaterialIcons',
    },
    { title: 'Banheiro', type: 'bathroom', icon: 'wc', lib: 'MaterialIcons' },
    {
      title: 'Banheiro Adaptado',
      type: 'accessible_bathroom',
      icon: 'accessible-forward',
      lib: 'MaterialIcons',
    },
    {
      title: 'Sala de Espera',
      type: 'waiting_room',
      icon: 'weekend',
      lib: 'MaterialIcons',
    },
    { title: 'TV', type: 'tv', icon: 'tv', lib: 'MaterialIcons' },
    {
      title: 'Som Ambiente',
      type: 'ambient_music',
      icon: 'music-note',
      lib: 'MaterialIcons',
    },
    {
      title: 'Café',
      type: 'coffee',
      icon: 'coffee',
      lib: 'MaterialCommunityIcons',
    },
    {
      title: 'Água',
      type: 'water',
      icon: 'water',
      lib: 'MaterialCommunityIcons',
    },
    {
      title: 'Bebidas',
      type: 'drinks',
      icon: 'cup',
      lib: 'MaterialCommunityIcons',
    },
    {
      title: 'Pet Friendly',
      type: 'pet_friendly',
      icon: 'paw',
      lib: 'MaterialCommunityIcons',
    },
    {
      title: 'Espaço Kids',
      type: 'kids_area',
      icon: 'child-care',
      lib: 'MaterialIcons',
    },
    {
      title: 'Aceita Cartão',
      type: 'card_payment',
      icon: 'credit-card',
      lib: 'MaterialIcons',
    },
    {
      title: 'Aceita PIX',
      type: 'pix_payment',
      icon: 'qrcode',
      lib: 'MaterialCommunityIcons',
    },
    {
      title: 'Pagamento em Dinheiro',
      type: 'cash_payment',
      icon: 'money',
      lib: 'MaterialCommunityIcons',
    },
    {
      title: 'Atendimento Masculino',
      type: 'male_service',
      icon: 'male',
      lib: 'MaterialCommunityIcons',
    },
    {
      title: 'Atendimento Feminino',
      type: 'female_service',
      icon: 'female',
      lib: 'MaterialCommunityIcons',
    },
    {
      title: 'Atendimento Infantil',
      type: 'kids_service',
      icon: 'baby-face-outline',
      lib: 'MaterialCommunityIcons',
    },
    {
      title: 'Profissionais Certificados',
      type: 'certified_professionals',
      icon: 'badge-check',
      lib: 'MaterialCommunityIcons',
    },
    {
      title: 'Produtos à Venda',
      type: 'products_for_sale',
      icon: 'shopping-outline',
      lib: 'MaterialCommunityIcons',
    },
    {
      title: 'Ambiente Privativo',
      type: 'private_environment',
      icon: 'lock',
      lib: 'MaterialCommunityIcons',
    },
  ] as any[];

  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    // await this.run();
  }

  async run() {
    try {
      await this.prismaService.amenities.createMany({
        data: this.AMENITIES_SEED,
        skipDuplicates: true,
      });

      this.logger.debug('Amenities seeding completed.');
    } catch (error) {
      this.logger.error('Error during amenities seeding:', error);
    }
  }
}
