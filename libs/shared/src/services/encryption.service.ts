import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { EnvSchemaType } from '../environment';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService<EnvSchemaType>) {
    const key = this.configService.getOrThrow('ENCRYPTION_KEY');
    if (!key || key.length !== 32)
      throw new Error('A chave de criptografia deve ter 32 caracteres.');
    this.key = Buffer.from(key);
  }

  encrypt(text: string): { iv: string; encryptedData: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
    };
  }

  decrypt({
    encryptedText,
    iv,
  }: {
    encryptedText: string;
    iv: string;
  }): string {
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex'),
    );

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
