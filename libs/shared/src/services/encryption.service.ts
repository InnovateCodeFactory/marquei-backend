import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { EnvSchemaType } from '../environment';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly legacyAlgorithm = 'aes-256-cbc';
  private readonly payloadPrefix = 'v2:';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService<EnvSchemaType>) {
    const key = this.configService.getOrThrow('ENCRYPTION_KEY');
    if (!key || key.length !== 32)
      throw new Error('A chave de criptografia deve ter 32 caracteres.');
    this.key = Buffer.from(key);
  }

  encrypt(text: string): { iv: string; encryptedData: string } {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    return {
      iv: iv.toString('hex'),
      encryptedData: `${this.payloadPrefix}${encrypted}:${tag}`,
    };
  }

  decrypt({
    encryptedText,
    iv,
  }: {
    encryptedText: string;
    iv: string;
  }): string {
    if (encryptedText?.startsWith(this.payloadPrefix)) {
      const payload = encryptedText.slice(this.payloadPrefix.length);
      const [ciphertext, tag] = payload.split(':');
      if (!ciphertext || !tag) {
        throw new Error('Encrypted payload inválido');
      }

      const decipher = createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(iv, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    const legacyDecipher = createDecipheriv(
      this.legacyAlgorithm,
      this.key,
      Buffer.from(iv, 'hex'),
    );

    let decrypted = legacyDecipher.update(encryptedText, 'hex', 'utf8');
    decrypted += legacyDecipher.final('utf8');
    return decrypted;
  }
}
