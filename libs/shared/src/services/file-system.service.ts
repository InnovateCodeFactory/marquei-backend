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
  private readonly customDomain: string;

  constructor(private readonly configService: ConfigService<EnvSchemaType>) {
    const endpoint = this.configService.getOrThrow('R2_ENDPOINT');

    this.s3 = new S3Client({
      region: this.configService.getOrThrow('R2_REGION'),
      endpoint,
      credentials: {
        accessKeyId: this.configService.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow('R2_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });

    this.bucket = this.configService.getOrThrow('R2_BUCKET');
    this.signedUrlTtl = this.configService.getOrThrow('R2_SIGNED_URL_TTL');
    this.customDomain = this.configService.getOrThrow('R2_CUSTOM_DOMAIN');
  }

  async upload({
    key,
    body,
    contentType,
    cacheControl = 'public, max-age=31536000, immutable',
    contentDisposition,
    metadata,
    bucket,
  }: UploadInput) {
    const finalKey = key.startsWith('marquei/') ? key : `marquei/${key}`;
    const finalBucket = bucket || this.bucket;
    const finalContentType =
      contentType ||
      (typeof key === 'string'
        ? lookupMime(key) || 'application/octet-stream'
        : 'application/octet-stream');

    const cmd = new PutObjectCommand({
      Bucket: finalBucket,
      Key: finalKey,
      Body: body as any,
      ContentType: String(finalContentType),
      CacheControl: cacheControl,
      ContentDisposition: contentDisposition,
      Metadata: metadata,
    });

    const res = await this.s3.send(cmd);
    const publicUrl = this.getPublicUrl({ key });

    return { etag: res.ETag, publicUrl, key: finalKey };
  }

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

  async head(key: string, bucket?: string) {
    const res = await this.s3.send(
      new HeadObjectCommand({ Bucket: bucket || this.bucket, Key: key }),
    );
    return res; // { ContentType, ContentLength, Metadata, ... }
  }

  async getObjectStream(key: string, bucket?: string) {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: bucket || this.bucket, Key: key }),
    );
    // res.Body é ReadableStream (node: Readable)
    return res.Body as Readable;
  }

  async delete(key: string, bucket?: string) {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: bucket || this.bucket, Key: key }),
    );
    return { key, deleted: true };
  }

  getPublicUrl({ key }: { key: string }) {
    if (!key) return null;

    const base = this.customDomain;
    return `${base.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
  }
}
