import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lookup as lookupMime } from 'mime-types';
import { Readable } from 'stream';
import { EnvSchemaType } from '../environment';

type UploadInput = {
  key: string; // ex: 'uploads/2025/08/file.pdf'
  body: Buffer | Uint8Array | Blob | string | Readable;
  contentType?: string; // se não vier, tenta descobrir pelo key
  cacheControl?: string; // ex: 'public, max-age=31536000, immutable'
  contentDisposition?: string; // ex: 'inline' | 'attachment; filename="x.pdf"'
  metadata?: Record<string, string>;
  bucket?: string; // opcional, por default usa env R2_BUCKET
};

@Injectable()
export class FileSystemService {
  private readonly logger = new Logger(FileSystemService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly signedUrlTtl: number;

  constructor(private readonly configService: ConfigService<EnvSchemaType>) {
    const endpoint = this.configService.getOrThrow('R2_ENDPOINT');

    this.s3 = new S3Client({
      region: this.configService.getOrThrow('R2_REGION'),
      endpoint,
      credentials: {
        accessKeyId: this.configService.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow('R2_SECRET_ACCESS_KEY'),
      },
      // R2 requer path-style (sem bucket no host)
      forcePathStyle: true,
    });

    this.bucket = this.configService.getOrThrow('R2_BUCKET');
    this.signedUrlTtl = this.configService.getOrThrow('R2_SIGNED_URL_TTL');
  }

  /**
   * Upload (privado por padrão). Retorna { key, etag }
   */
  async upload({
    key,
    body,
    contentType,
    cacheControl,
    contentDisposition,
    metadata,
    bucket,
  }: UploadInput) {
    const finalBucket = bucket || this.bucket;
    const finalContentType =
      contentType ||
      (typeof key === 'string'
        ? lookupMime(key) || 'application/octet-stream'
        : 'application/octet-stream');

    const cmd = new PutObjectCommand({
      Bucket: finalBucket,
      Key: key,
      Body: body as any,
      ContentType: String(finalContentType),
      CacheControl: cacheControl,
      ContentDisposition: contentDisposition,
      Metadata: metadata,
      // ACL não é necessário na R2; objetos são privados a menos que você use Access Policies
    });

    const res = await this.s3.send(cmd);
    return { key, etag: res.ETag };
  }

  /**
   * Gera URL assinada de GET para download temporário
   */
  async getSignedUrl(
    key: string,
    opts?: { expiresIn?: number; bucket?: string },
  ) {
    const finalBucket = opts?.bucket || this.bucket;
    const expiresIn = opts?.expiresIn ?? this.signedUrlTtl;

    const cmd = new GetObjectCommand({ Bucket: finalBucket, Key: key });
    const url = await getSignedUrl(this.s3, cmd, { expiresIn });
    return { url, expiresIn, key };
  }

  /**
   * HEAD (metadados) — útil para checar existência/Content-Type/Content-Length
   */
  async head(key: string, bucket?: string) {
    const res = await this.s3.send(
      new HeadObjectCommand({ Bucket: bucket || this.bucket, Key: key }),
    );
    return res; // { ContentType, ContentLength, Metadata, ... }
  }

  /**
   * GET como stream (server-to-server)
   */
  async getObjectStream(key: string, bucket?: string) {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: bucket || this.bucket, Key: key }),
    );
    // res.Body é ReadableStream (node: Readable)
    return res.Body as Readable;
  }

  /**
   * Delete do objeto
   */
  async delete(key: string, bucket?: string) {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: bucket || this.bucket, Key: key }),
    );
    return { key, deleted: true };
  }
}
