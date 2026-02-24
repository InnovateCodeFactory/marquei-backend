import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { AppUpdateMode } from '@prisma/client';
import { extname } from 'path';
import { InnovateConnectCreateAppUpdateModalDto } from '../dto/requests/innovate-connect-create-app-update-modal.dto';

@Injectable()
export class InnovateConnectCreateAppUpdateModalUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute(
    dto: InnovateConnectCreateAppUpdateModalDto,
    file?: Express.Multer.File,
  ) {
    const mode = dto.mode;
    const audience = dto.audience ?? 'PROFESSIONAL';

    const targetBuildIos = this.normalizeBuild(dto.target_build_ios);
    const targetBuildAndroid = this.normalizeBuild(dto.target_build_android);

    if (!targetBuildIos && !targetBuildAndroid) {
      throw new BadRequestException(
        'Informe target_build_ios ou target_build_android',
      );
    }

    const whatsNewItems = this.normalizeWhatsNewItems(dto.whats_new_items);
    let bannerKey: string | null = null;

    if (mode === AppUpdateMode.whats_new) {
      if (!file) {
        throw new BadRequestException(
          'Banner é obrigatório para modais do tipo whats_new',
        );
      }
      if (whatsNewItems.length === 0) {
        throw new BadRequestException(
          'Informe ao menos um item em whats_new_items',
        );
      }
      bannerKey = await this.uploadBanner(file, dto.banner_file_name);
    } else {
      if (file) {
        throw new BadRequestException(
          'Banner só é permitido para modais do tipo whats_new',
        );
      }
    }

    const created = await this.prisma.appUpdateModal.create({
      data: {
        mode,
        audience,
        title: dto.title.trim(),
        description: dto.description.trim(),
        banner_url: bannerKey,
        whats_new_items: whatsNewItems,
        primary_button_label: dto.primary_button_label?.trim() || null,
        secondary_button_label: dto.secondary_button_label?.trim() || null,
        target_version_ios: dto.target_version_ios?.trim() || null,
        target_version_android: dto.target_version_android?.trim() || null,
        target_build_ios: targetBuildIos,
        target_build_android: targetBuildAndroid,
        cta_path: dto.cta_path?.trim() || null,
        cta_scope: dto.cta_scope || null,
        is_active: false,
      },
      select: {
        id: true,
        mode: true,
        audience: true,
        title: true,
        description: true,
        banner_url: true,
        whats_new_items: true,
        primary_button_label: true,
        secondary_button_label: true,
        target_version_ios: true,
        target_version_android: true,
        target_build_ios: true,
        target_build_android: true,
        cta_path: true,
        cta_scope: true,
        is_active: true,
        created_at: true,
      },
    });

    return {
      ...created,
      banner_key: created.banner_url,
      banner_url: created.banner_url
        ? this.fileSystem.getPublicUrl({ key: created.banner_url })
        : null,
    };
  }

  private normalizeBuild(value?: number) {
    if (!value || !Number.isFinite(Number(value))) return null;
    const parsed = Number(value);
    return parsed > 0 ? Math.trunc(parsed) : null;
  }

  private normalizeWhatsNewItems(value?: string): string[] {
    if (!value?.trim()) return [];
    const raw = value.trim();

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean);
      }
    } catch {
      // fallback em texto linha a linha
    }

    return raw
      .split(/\r?\n|;/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private async uploadBanner(file: Express.Multer.File, inputName?: string) {
    const baseName = this.sanitizeFileName(inputName);
    if (!baseName) {
      throw new BadRequestException('Informe banner_file_name válido');
    }

    const extFromInput = extname(inputName?.trim() || '').toLowerCase();
    const extFromOriginal = extname(file.originalname || '').toLowerCase();
    const extension = extFromInput || extFromOriginal || this.extByMime(file.mimetype);

    const key = `promotional/whats-new-in-app/${baseName}${extension}`;

    await this.fileSystem.upload({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    return key;
  }

  private sanitizeFileName(input?: string) {
    if (!input?.trim()) return '';
    const withoutExt = input.trim().replace(/\.[^.]+$/, '');
    return withoutExt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private extByMime(mime?: string) {
    switch ((mime || '').toLowerCase()) {
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/jpeg':
      default:
        return '.jpg';
    }
  }
}

