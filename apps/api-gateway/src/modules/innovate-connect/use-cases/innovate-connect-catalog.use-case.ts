import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InnovateConnectCatalogUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const [users, businesses, subscriptions, services, logs, appUpdates] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.business.count(),
        this.prisma.businessSubscription.count(),
        this.prisma.service.count(),
        this.prisma.logs.count(),
        this.prisma.appUpdateModal.count(),
      ]);

    return [
      {
        key: 'users',
        label: 'Users',
        description: 'Usuários (profissionais e clientes)',
        count: users,
        endpoint: '/innovate-connect/users',
      },
      {
        key: 'businesses',
        label: 'Businesses',
        description: 'Negócios cadastrados',
        count: businesses,
        endpoint: '/innovate-connect/businesses',
      },
      {
        key: 'services',
        label: 'Services',
        description: 'Serviços oferecidos pelos negócios',
        count: services,
        endpoint: '/innovate-connect/services',
      },
      {
        key: 'subscriptions',
        label: 'Subscriptions',
        description: 'Assinaturas dos negócios',
        count: subscriptions,
        endpoint: '/innovate-connect/subscriptions',
      },
      {
        key: 'logs',
        label: 'Logs',
        description: 'Logs de requisições e eventos',
        count: logs,
        endpoint: '/innovate-connect/logs',
      },
      {
        key: 'app_updates',
        label: 'App Updates',
        description: 'Modais de atualização e novidades do app',
        count: appUpdates,
        endpoint: '/innovate-connect/app-updates',
      },
    ];
  }
}
