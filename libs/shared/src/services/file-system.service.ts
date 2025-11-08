import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lookup as lookupMime } from 'mime-types';
import { Client as MinioClient } from 'minio';
import { Readable } from 'stream';
import { EnvSchemaType } from '../environment';

// Se você tem um tipo forte do seu config, use-o aqui
// type EnvSchemaType = ...

type UploadInput = {
  key: string; // ex: 'uploads/2025/08/file.pdf'
  body: Buffer | Uint8Array | string | Readable;
  contentType?: string;
  cacheControl?: string; // ex.: 'public, max-age=31536000, immutable'
  contentDisposition?: string; // ex.: 'inline' | 'attachment; filename="x.pdf"'
  metadata?: Record<string, string>;
  bucket?: string;
  size?: number; // útil se body for stream e você souber o tamanho
};

@Injectable()
export class FileSystemService {
  private readonly logger = new Logger(FileSystemService.name);
  private readonly client: MinioClient;

  private readonly bucket: string;
  private readonly signedUrlTtl: number;
  private readonly customDomain: string;

  constructor(private readonly config: ConfigService<EnvSchemaType>) {
    const endPoint = this.config.get<string>('MINIO_ENDPOINT', '127.0.0.1');
    const port = Number(this.config.get<string>('MINIO_PORT', '9100'));
    const useSSL = String(this.config.get('MINIO_USE_SSL', 'false')) === 'true';

    const accessKey = this.config.get<string>('MINIO_ACCESS_KEY', '');
    const secretKey = this.config.get<string>('MINIO_SECRET_KEY', '');

    if (!accessKey || !secretKey) {
      throw new Error('MINIO_ACCESS_KEY / MINIO_SECRET_KEY não configurados');
    }

    this.client = new MinioClient({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
      // region é ignorado pelo MinIO; não precisa setar
    });

    this.bucket = this.config.getOrThrow<string>('MINIO_BUCKET');
    this.signedUrlTtl = Number(this.config.getOrThrow('MINIO_SIGNED_URL_TTL'));
    this.customDomain = this.config.getOrThrow<string>('MINIO_PUBLIC_BASE'); // ex.: https://api-minio.innovatecode.online
  }

  /**
   * Upload (PUT) — mantém assinatura/retorno do seu serviço anterior.
   */
  async upload({
    key,
    body,
    contentType,
    cacheControl = 'public, max-age=31536000, immutable',
    contentDisposition,
    metadata,
    bucket,
    size,
  }: UploadInput) {
    const finalBucket = bucket || this.bucket;

    const finalContentType =
      contentType ||
      (typeof key === 'string'
        ? (lookupMime(key) as string) || 'application/octet-stream'
        : 'application/octet-stream');

    const metaData: Record<string, string> = {
      'Content-Type': String(finalContentType),
      'Cache-Control': cacheControl,
      ...(contentDisposition
        ? { 'Content-Disposition': contentDisposition }
        : {}),
      ...(metadata || {}),
    };

    const { etag } = await this.client.putObject(
      finalBucket,
      key,
      body as any,
      typeof size === 'number' ? size : undefined,
      metaData as any,
    );

    const publicUrl = this.getPublicUrl({ key });
    return { etag, publicUrl, key };
  }

  /**
   * URL pré-assinada de GET (equivalente ao seu getSignedUrl anterior).
   */
  async getSignedUrl(
    key: string,
    opts?: { expiresIn?: number; bucket?: string },
  ) {
    const finalBucket = opts?.bucket || this.bucket;
    const expiry = opts?.expiresIn ?? this.signedUrlTtl;

    const url = await this.client.presignedGetObject(finalBucket, key, expiry);
    return { url, expiresIn: expiry, key };
  }

  /**
   * URL pré-assinada de PUT — para upload direto do cliente (web/app).
   */
  async presignedUploadUrl(
    key: string,
    opts?: { expiresIn?: number; bucket?: string },
  ) {
    const finalBucket = opts?.bucket || this.bucket;
    const expiry = opts?.expiresIn ?? this.signedUrlTtl;

    const url = await this.client.presignedPutObject(finalBucket, key, expiry);
    return { url, expiresIn: expiry, key };
  }

  /**
   * Head — mapeia para statObject (ContentType, size, metaData, etc.).
   */
  async head(key: string, bucket?: string) {
    const res = await this.client.statObject(bucket || this.bucket, key);
    return res;
  }

  /**
   * Obter stream do objeto.
   */
  async getObjectStream(key: string, bucket?: string) {
    const stream = await this.client.getObject(bucket || this.bucket, key);
    return stream as Readable;
  }

  /**
   * Delete.
   */
  async delete(key: string, bucket?: string) {
    await this.client.removeObject(bucket || this.bucket, key);
    return { key, deleted: true };
  }

  /**
   * Monta URL pública (path-style). Se o bucket estiver público (read-only),
   * abrirá sem autenticação.
   */
  getPublicUrl({ key }: { key: string | null }) {
    if (!key) return null;
    const base = this.customDomain.replace(/\/+$/, ''); // ex.: https://api-minio.innovatecode.online
    // Você já prefixa com <bucket>/..., então só encode do path:
    return `${base}/${this.bucket}/${encodeURI(key)}`;
  }
}
