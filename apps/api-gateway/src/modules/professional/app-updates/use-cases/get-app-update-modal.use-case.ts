import { PrismaService } from '@app/shared';
import { systemGeneralSettings } from '@app/shared/config/system-general-settings';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';

type AppMeta = {
  /**
   * Versão "humana" (ex: 1.2.1) — apenas para log/visualização/telemetria.
   */
  appVersion?: string;

  /**
   * ✅ iOS: buildNumber (numérico) | Android: versionCode (numérico)
   * Esse é o valor usado para comparação no banco.
   */
  appBuildNumber?: number;

  /**
   * "ios" | "android"
   */
  appOs?: string;
};

type UseCaseResult = {
  should_open_app_update_modal: boolean;
  app_update_modal: any | null;
};

@Injectable()
export class GetAppUpdateModalUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileSystem: FileSystemService,
    // 🔥 Se você tiver Redis: injete aqui (ex: CacheService/RedisService)
    // private readonly cache: CacheService,
  ) {}

  async execute(user: CurrentUser, meta: AppMeta): Promise<UseCaseResult> {
    if (!user?.id) return this.empty();

    const os = (meta?.appOs ?? '').toLowerCase();
    if (os !== 'ios' && os !== 'android') return this.empty();

    const build = meta?.appBuildNumber;
    if (!Number.isInteger(build) || (build as number) <= 0) return this.empty();

    const buildField =
      os === 'ios' ? 'target_build_ios' : 'target_build_android';

    /**
     * ✅ Onde encaixar Redis (cache):
     *
     * - Key sugerida:
     *   `app_update_modal:pro:${user.id}:${os}:${build}`
     *
     * - TTL sugerido:
     *   30s ~ 120s (curto)
     *
     * - Estratégia:
     *   1) Tentar cache e retornar imediatamente se existir.
     *   2) Se não existir, faz as queries abaixo.
     *   3) Salva no cache o resultado (inclusive "não tem modal").
     *
     * Observação:
     * - Como existe lógica de "interactions" (viewed / primary_clicked),
     *   TTL curto evita inconsistências chatas.
     *
     * Exemplo:
     * const cacheKey = `app_update_modal:pro:${user.id}:${os}:${build}`;
     * const cached = await this.cache.get<UseCaseResult>(cacheKey);
     * if (cached) return cached;
     */

    // 1) Prioridade: modal de update (target_build > build do usuário)
    // Bloqueio por 24h se já viu ou clicou no primário.
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const updateModal = await this.prisma.appUpdateModal.findFirst({
      where: {
        is_active: true,
        audience: 'PROFESSIONAL',
        mode: 'new_app_version',
        [buildField]: { gt: build },
        interactions: {
          none: {
            user_id: user.id,
            action: { in: ['viewed', 'primary_clicked'] },
            created_at: { gte: cutoff24h },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      select: this.selectModal(),
    });

    if (updateModal) {
      // best-effort, não impacta a latência da home
      void this.recordViewed({
        userId: user.id,
        appUpdateId: updateModal.id,
        appVersion: meta?.appVersion,
        appOs: os,
        appBuildNumber: build,
      });

      const result: UseCaseResult = {
        should_open_app_update_modal: true,
        app_update_modal: {
          ...updateModal,
          banner_url: updateModal.banner_url
            ? this.fileSystem.getPublicUrl({ key: updateModal.banner_url })
            : null,
          store_url:
            os === 'ios'
              ? systemGeneralSettings.marquei_pro_app_store_url
              : systemGeneralSettings.marquei_pro_play_store_url,
        },
      };

      // ✅ cache.set(cacheKey, result, ttl)
      return result;
    }

    // 2) Fallback: "what's new" (target_build == build do usuário)
    // Mostra apenas uma vez por modal (sem janela de 24h)
    const whatsNewModal = await this.prisma.appUpdateModal.findFirst({
      where: {
        is_active: true,
        audience: 'PROFESSIONAL',
        mode: 'whats_new',
        [buildField]: build,
        interactions: {
          none: {
            user_id: user.id,
            action: 'viewed',
          },
        },
      },
      orderBy: { created_at: 'desc' },
      select: this.selectModal(),
    });

    if (whatsNewModal) {
      void this.recordViewed({
        userId: user.id,
        appUpdateId: whatsNewModal.id,
        appVersion: meta?.appVersion,
        appOs: os,
        appBuildNumber: build,
      });

      const result: UseCaseResult = {
        should_open_app_update_modal: true,
        app_update_modal: {
          ...whatsNewModal,
          banner_url: whatsNewModal.banner_url
            ? this.fileSystem.getPublicUrl({ key: whatsNewModal.banner_url })
            : null,
        },
      };

      // ✅ cache.set(cacheKey, result, ttl)
      return result;
    }

    const result = this.empty();
    // ✅ cache.set(cacheKey, result, ttl)
    return result;
  }

  private empty(): UseCaseResult {
    return { should_open_app_update_modal: false, app_update_modal: null };
  }

  private selectModal() {
    return {
      id: true,
      mode: true,
      title: true,
      description: true,
      banner_url: true,
      whats_new_items: true,
      primary_button_label: true,
      secondary_button_label: true,
      cta_path: true,
      cta_scope: true,

      // string para visual/log
      target_version_ios: true,
      target_version_android: true,

      // numérico para comparação performática
      target_build_ios: true,
      target_build_android: true,
    } as const;
  }

  private async recordViewed(input: {
    userId: string;
    appUpdateId: string;
    appVersion?: string;
    appOs?: string;
    appBuildNumber?: number;
  }) {
    try {
      // ✅ 1 query (upsert) por causa do @@unique(app_update_id, user_id, action)
      await this.prisma.appUpdateInteraction.upsert({
        where: {
          uq_app_update_interaction_action: {
            app_update_id: input.appUpdateId,
            user_id: input.userId,
            action: 'viewed',
          },
        },
        update: {},
        create: {
          app_update_id: input.appUpdateId,
          user_id: input.userId,
          action: 'viewed',
          app_version: input.appVersion,
          app_os: input.appOs,
          app_build_number: input.appBuildNumber,
        },
        select: { id: true },
      });
    } catch {
      // ignora erro de contabilização para não quebrar o fluxo
    }
  }
}
