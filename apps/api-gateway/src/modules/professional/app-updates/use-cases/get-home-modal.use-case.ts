import { PrismaService } from '@app/shared';
import { systemGeneralSettings } from '@app/shared/config/system-general-settings';
import { RedisService } from '@app/shared/modules/redis/redis.service';
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

type HomeModal =
  | {
      type: 'app_update';
      payload: any;
    }
  | {
      type: 'plan_expiring';
      payload: {
        expires_at: string;
        plan_name?: string | null;
        billing_period?: string | null;
        business_name?: string | null;
      };
    }
  | {
      type: 'business_photos_missing';
      payload: {
        missing_logo: boolean;
        missing_cover: boolean;
        business_name?: string | null;
      };
    };

type UseCaseResult = {
  should_open_modal: boolean;
  modal: HomeModal | null;
};

@Injectable()
export class GetHomeModalUseCase {
  // TTL curto (mínimo) para reduzir chamadas repetidas na Home
  private static readonly HOME_MODAL_CACHE_TTL_SECONDS = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileSystem: FileSystemService,
    private readonly redis: RedisService,
  ) {}

  async execute(user: CurrentUser, meta: AppMeta): Promise<UseCaseResult> {
    if (!user?.id) return this.empty();

    const os = (meta?.appOs ?? '').toLowerCase();
    const isValidOs = os === 'ios' || os === 'android';

    const build = meta?.appBuildNumber;
    const isValidBuild = Number.isInteger(build) && (build as number) > 0;

    const buildField = isValidOs
      ? os === 'ios'
        ? 'target_build_ios'
        : 'target_build_android'
      : null;

    const businessId = user.current_selected_business_id ?? 'none';
    const cacheKey = `home_modal:pro:${user.id}:${businessId}:${isValidOs ? os : 'unknown'}:${isValidBuild ? build : '0'}`;

    // ✅ cache mínimo e curto (retorna até mesmo "sem modal")
    try {
      const cached = await this.redis.get({ key: cacheKey });
      if (cached) return JSON.parse(cached) as UseCaseResult;
    } catch {
      // cache best-effort
    }

    // 1) Apenas o que é realmente necessário em paralelo:
    // - business é necessário para as regras 2 e 3 (owner + fotos faltando)
    // - updateModal é necessário para a prioridade 1
    const businessPromise = user.current_selected_business_id
      ? this.prisma.business.findUnique({
          where: { id: user.current_selected_business_id },
          select: {
            id: true,
            name: true,
            ownerId: true,
            logo: true,
            coverImage: true,
          },
        })
      : Promise.resolve(null);

    const updateModalPromise =
      isValidOs && isValidBuild && buildField
        ? this.findUpdateModal({
            buildField,
            build: build as number,
            userId: user.id,
          })
        : Promise.resolve(null);

    const [business, updateModal] = await Promise.all([
      businessPromise,
      updateModalPromise,
    ]);

    // 1) Prioridade: modal de update (target_build > build do usuário)
    if (updateModal) {
      void this.recordViewed({
        userId: user.id,
        appUpdateId: updateModal.id,
        appVersion: meta?.appVersion,
        appOs: isValidOs ? os : undefined,
        appBuildNumber: isValidBuild ? (build as number) : undefined,
      });

      const result: UseCaseResult = {
        should_open_modal: true,
        modal: {
          type: 'app_update',
          payload: {
            ...updateModal,
            banner_url: updateModal.banner_url
              ? this.fileSystem.getPublicUrl({ key: updateModal.banner_url })
              : null,
            store_url:
              os === 'ios'
                ? systemGeneralSettings.marquei_pro_app_store_url
                : systemGeneralSettings.marquei_pro_play_store_url,
          },
        },
      };

      void this.saveCache(cacheKey, result);
      return result;
    }

    const isOwner = business?.ownerId === user.id;
    const expiresAt: any =
      user.current_business_subscription_current_period_end;

    const expiresAtTime =
      expiresAt instanceof Date
        ? expiresAt.getTime()
        : typeof expiresAt === 'string'
          ? Date.parse(expiresAt)
          : NaN;

    const remainingMs = Number.isFinite(expiresAtTime)
      ? expiresAtTime - Date.now()
      : NaN;

    const shouldShowTrialExpiring =
      isOwner &&
      user.current_business_subscription_plan_billing_period === 'FREE_TRIAL' &&
      Number.isFinite(remainingMs) &&
      remainingMs > 0 &&
      remainingMs <= 5 * 24 * 60 * 60 * 1000;

    // 2) Plano grátis expira em até 7 dias (mantido como você deixou)
    if (shouldShowTrialExpiring && expiresAt) {
      const result: UseCaseResult = {
        should_open_modal: true,
        modal: {
          type: 'plan_expiring',
          payload: null, // intencional, mantido
        },
      };

      void this.saveCache(cacheKey, result);
      return result;
    }

    // 3) Fotos do negócio (logo/banner) faltando
    if (isOwner && business) {
      const missingLogo = !business.logo;
      const missingCover = !business.coverImage;
      if (missingLogo || missingCover) {
        const result: UseCaseResult = {
          should_open_modal: true,
          modal: {
            type: 'business_photos_missing',
            payload: {
              missing_logo: missingLogo,
              missing_cover: missingCover,
              business_name: business?.name ?? null,
            },
          },
        };

        void this.saveCache(cacheKey, result);
        return result;
      }
    }

    // 4) Só agora buscar "What's new" (evita query à toa)
    const whatsNewModal =
      isValidOs && isValidBuild && buildField
        ? await this.findWhatsNewModal({
            buildField,
            build: build as number,
            userId: user.id,
          })
        : null;

    if (whatsNewModal) {
      void this.recordViewed({
        userId: user.id,
        appUpdateId: whatsNewModal.id,
        appVersion: meta?.appVersion,
        appOs: isValidOs ? os : undefined,
        appBuildNumber: isValidBuild ? (build as number) : undefined,
      });

      const result: UseCaseResult = {
        should_open_modal: true,
        modal: {
          type: 'app_update',
          payload: {
            ...whatsNewModal,
            banner_url: whatsNewModal.banner_url
              ? this.fileSystem.getPublicUrl({ key: whatsNewModal.banner_url })
              : null,
          },
        },
      };

      void this.saveCache(cacheKey, result);
      return result;
    }

    const result = this.empty();
    void this.saveCache(cacheKey, result);
    return result;
  }

  private empty(): UseCaseResult {
    return { should_open_modal: false, modal: null };
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

  private findUpdateModal(input: {
    buildField: 'target_build_ios' | 'target_build_android';
    build: number;
    userId: string;
  }) {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return this.prisma.appUpdateModal.findFirst({
      where: {
        is_active: true,
        audience: 'PROFESSIONAL',
        mode: 'new_app_version',
        [input.buildField]: { gt: input.build },
        interactions: {
          none: {
            user_id: input.userId,
            action: { in: ['viewed', 'primary_clicked'] },
            created_at: { gte: cutoff24h },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      select: this.selectModal(),
    });
  }

  private findWhatsNewModal(input: {
    buildField: 'target_build_ios' | 'target_build_android';
    build: number;
    userId: string;
  }) {
    return this.prisma.appUpdateModal.findFirst({
      where: {
        is_active: true,
        audience: 'PROFESSIONAL',
        mode: 'whats_new',
        [input.buildField]: input.build,
        interactions: {
          none: {
            user_id: input.userId,
            action: 'viewed',
          },
        },
      },
      orderBy: { created_at: 'desc' },
      select: this.selectModal(),
    });
  }

  private async recordViewed(input: {
    userId: string;
    appUpdateId: string;
    appVersion?: string;
    appOs?: string;
    appBuildNumber?: number;
  }) {
    try {
      await this.prisma.appUpdateInteraction.upsert({
        where: {
          // ⚠️ precisa existir no seu Prisma Client (autocomplete)
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
      // ignora erro de contabilização
    }
  }

  private async saveCache(key: string, value: UseCaseResult) {
    try {
      await this.redis.set({
        key,
        value: JSON.stringify(value),
        ttlInSeconds: GetHomeModalUseCase.HOME_MODAL_CACHE_TTL_SECONDS,
      });
    } catch {
      // best-effort
    }
  }
}
