import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface Recipient {
  keyId: string;
  publicKey: string;
}

export interface EncryptedKeyEntry {
  keyId: string;
  encryptedKey: string;
}

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);

  generateAESKey(): { key: Buffer; iv: Buffer } {
    return {
      key: crypto.randomBytes(32), // 256 bits
      iv: crypto.randomBytes(12),  // 96 bits (GCM recommended)
    };
  }

  encryptAES(data: Buffer, key: Buffer, iv: Buffer): { encrypted: Buffer; authTag: Buffer } {
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { encrypted, authTag };
  }

  encryptRSA(data: Buffer, publicKeyPem: string): Buffer {
    return crypto.publicEncrypt(
      { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      data,
    );
  }

  hash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Crea payload seguro para múltiples destinatarios
   * @param fileBuffer - Buffer del archivo a cifrar
   * @param recipients - Array de destinatarios con keyId y publicKey
   */
  createSecurePayload(fileBuffer: Buffer, recipients: Recipient[]) {
    if (recipients.length === 0) {
      throw new Error('At least one recipient is required');
    }

    this.logger.log('Computing SHA-256 hash...');
    const fileHash = this.hash(fileBuffer);

    this.logger.log('Generating AES-256 key + IV...');
    const { key, iv } = this.generateAESKey();

    this.logger.log('Encrypting with AES-256-GCM...');
    const { encrypted, authTag } = this.encryptAES(fileBuffer, key, iv);

    this.logger.log(`Encrypting AES key for ${recipients.length} recipient(s)...`);
    const encryptedKeys: EncryptedKeyEntry[] = recipients.map(recipient => {
      const encryptedKey = this.encryptRSA(key, recipient.publicKey);
      this.logger.log(`  - Encrypted for keyId: ${recipient.keyId}`);
      return {
        keyId: recipient.keyId,
        encryptedKey: encryptedKey.toString('base64'),
      };
    });

    return {
      encryptedFile: encrypted.toString('base64'),
      encryptedKeys,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      hash: fileHash,
    };
  }

  /**
   * @deprecated Use createSecurePayload with recipients array instead
   * Mantiene compatibilidad con código legacy
   */
  createSecurePayloadLegacy(fileBuffer: Buffer, publicKeyPem: string) {
    this.logger.log('Computing SHA-256 hash...');
    const fileHash = this.hash(fileBuffer);

    this.logger.log('Generating AES-256 key + IV...');
    const { key, iv } = this.generateAESKey();

    this.logger.log('Encrypting with AES-256-GCM...');
    const { encrypted, authTag } = this.encryptAES(fileBuffer, key, iv);

    this.logger.log('Encrypting AES key with RSA-OAEP...');
    const encryptedKey = this.encryptRSA(key, publicKeyPem);

    return {
      encryptedFile: encrypted.toString('base64'),
      encryptedKey: encryptedKey.toString('base64'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      hash: fileHash,
    };
  }
}
