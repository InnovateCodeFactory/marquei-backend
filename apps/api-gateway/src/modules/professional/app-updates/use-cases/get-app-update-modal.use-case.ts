import { PrismaService } from '@app/shared';
import { systemGeneralSettings } from '@app/shared/config/system-general-settings';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';

type AppMeta = {
  appVersion?: string;
  appOs?: string;
};

@Injectable()
export class GetAppUpdateModalUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(user: CurrentUser, meta: AppMeta) {
    if (!user?.id)
      return { should_open_app_update_modal: false, app_update_modal: null };

    const appVersion = meta?.appVersion;
    const appOs = meta?.appOs;
    if (!appVersion || !appOs || !isValidVersion(appVersion)) {
      return { should_open_app_update_modal: false, app_update_modal: null };
    }

    const os = appOs.toLowerCase();
    if (os !== 'ios' && os !== 'android') {
      return { should_open_app_update_modal: false, app_update_modal: null };
    }

    const versionField =
      os === 'ios' ? 'target_version_ios' : 'target_version_android';

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const updateCandidates = await this.prisma.appUpdateModal.findMany({
      where: {
        is_active: true,
        audience: 'PROFESSIONAL',
        mode: 'new_app_version',
        AND: [
          { [versionField]: { not: null } },
          {
            interactions: {
              none: {
                user_id: user.id,
                action: { in: ['viewed', 'primary_clicked'] },
                created_at: { gte: cutoff },
              },
            },
          },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        target_version_ios: true,
        target_version_android: true,
        mode: true,
        title: true,
        description: true,
        banner_url: true,
        whats_new_items: true,
        primary_button_label: true,
        secondary_button_label: true,
        cta_path: true,
        cta_scope: true,
      },
    });

    for (const candidate of updateCandidates) {
      const target =
        os === 'ios'
          ? candidate.target_version_ios
          : candidate.target_version_android;
      if (
        target &&
        isValidVersion(target) &&
        compareVersions(target, appVersion) > 0
      ) {
        await this.recordViewed(user.id, candidate.id, appVersion, appOs);
        return {
          should_open_app_update_modal: true,
          app_update_modal: {
            ...candidate,
            store_url:
              os === 'ios'
                ? systemGeneralSettings.marquei_pro_app_store_url
                : systemGeneralSettings.marquei_pro_play_store_url,
          },
        };
      }
    }

    const whatsNewCandidates = await this.prisma.appUpdateModal.findMany({
      where: {
        is_active: true,
        audience: 'PROFESSIONAL',
        mode: 'whats_new',
        [versionField]: appVersion,
        interactions: {
          none: {
            user_id: user.id,
            action: 'viewed',
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        target_version_ios: true,
        target_version_android: true,
        mode: true,
        title: true,
        description: true,
        banner_url: true,
        whats_new_items: true,
        primary_button_label: true,
        secondary_button_label: true,
        cta_path: true,
        cta_scope: true,
      },
    });

    for (const candidate of whatsNewCandidates) {
      const target =
        os === 'ios'
          ? candidate.target_version_ios
          : candidate.target_version_android;
      if (
        target &&
        isValidVersion(target) &&
        compareVersions(target, appVersion) === 0
      ) {
        await this.recordViewed(user.id, candidate.id, appVersion, appOs);
        return {
          should_open_app_update_modal: true,
          app_update_modal: candidate,
        };
      }
    }

    return { should_open_app_update_modal: false, app_update_modal: null };
  }

  private async recordViewed(
    userId: string,
    appUpdateId: string,
    appVersion?: string,
    appOs?: string,
  ) {
    try {
      const existing = await this.prisma.appUpdateInteraction.findFirst({
        where: {
          app_update_id: appUpdateId,
          user_id: userId,
          action: 'viewed',
        },
        select: { id: true },
      });

      if (!existing) {
        await this.prisma.appUpdateInteraction.create({
          data: {
            app_update_id: appUpdateId,
            user_id: userId,
            action: 'viewed',
            app_version: appVersion,
            app_os: appOs,
          },
        });
      }
    } catch {
      // ignora erro de contabilização para não quebrar o fluxo
    }
  }
}

function compareVersions(a: string, b: string): number {
  const parse = (value: string) =>
    value
      .trim()
      .split('.')
      .map((part) => Number(part))
      .filter((n) => Number.isFinite(n));

  const aParts = parse(a);
  const bParts = parse(b);

  if (!aParts.length || !bParts.length) return 0;

  const maxLen = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLen; i += 1) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }
  return 0;
}

function isValidVersion(value: string): boolean {
  return /^\d+(\.\d+)*$/.test(value.trim());
}
