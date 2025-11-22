import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class GetActivePlansUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(user: CurrentUser) {
    if (!user?.current_selected_business_slug)
      throw new UnauthorizedException(
        'Você não possui uma empresa selecionada',
      );

    // TODO: Não agrupar mais. Apenas retornar os planos normalmente já que agora só há um preço por plano, mas mantendo a estrutura de retorno ao frontend.
    // TODO: Alterar o recomendado para o plano premium

    return [];
  }

  private getPlanBillingPeriod(billingPeriod: string): string {
    const billingPeriods = {
      MONTHLY: 'Mensal',
      YEARLY: 'Anual',
    };

    return billingPeriods[billingPeriod] || 'Desconhecido';
  }
}
