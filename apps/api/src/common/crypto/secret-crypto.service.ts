import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const PREFIX = 'enc:v1:';

@Injectable()
export class SecretCryptoService {
  private readonly log = new Logger(SecretCryptoService.name);
  private readonly key: Buffer | null;

  constructor() {
    this.key = this.resolveKey();
    if (!this.key) {
      this.log.warn(
        'AI_SETTINGS_ENCRYPTION_KEY not set — API keys will not be encryptable. Set a 32-byte base64 key in production.',
      );
    }
  }

  isConfigured(): boolean {
    return this.key != null;
  }

  encrypt(plaintext: string): string {
    if (!this.key) throw new Error('Encryption key not configured');
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    if (!this.key) throw new Error('Encryption key not configured');
    if (!ciphertext.startsWith(PREFIX)) {
      throw new Error('Invalid encrypted payload');
    }
    const raw = Buffer.from(ciphertext.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const data = raw.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  maskKey(key: string | null | undefined): string | null {
    if (!key) return null;
    const trimmed = key.trim();
    if (trimmed.length <= 8) return '••••••••';
    return `${trimmed.slice(0, 4)}${'•'.repeat(Math.min(12, trimmed.length - 8))}${trimmed.slice(-4)}`;
  }

  private resolveKey(): Buffer | null {
    const direct = (process.env.AI_SETTINGS_ENCRYPTION_KEY ?? '').trim();
    if (direct) {
      const buf = Buffer.from(direct, 'base64');
      if (buf.length === 32) return buf;
    }
    const fallback = (process.env.JWT_SECRET ?? process.env.APP_KEY ?? '').trim();
    if (!fallback) return null;
    return scryptSync(fallback, 'livegrid-ai-settings', 32);
  }
}
