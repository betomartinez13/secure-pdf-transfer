import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private privateKey: string;
  private publicKey: string;

  private readonly keysDir = process.env.KEYS_DIR || '/app/keys';
  private readonly privatePath = path.join(this.keysDir, 'tribunal_private.pem');
  private readonly publicPath = path.join(this.keysDir, 'tribunal_public.pem');

  async onModuleInit() {
    if (fs.existsSync(this.privatePath) && fs.existsSync(this.publicPath)) {
      this.logger.log('Loading existing RSA key pair from disk...');
      this.privateKey = fs.readFileSync(this.privatePath, 'utf-8');
      this.publicKey = fs.readFileSync(this.publicPath, 'utf-8');
    } else {
      this.logger.log('Generating new RSA-2048 key pair...');
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.privateKey = privateKey;
      this.publicKey = publicKey;

      fs.mkdirSync(this.keysDir, { recursive: true });
      fs.writeFileSync(this.privatePath, privateKey);
      fs.writeFileSync(this.publicPath, publicKey);
      this.logger.log('RSA key pair generated and saved.');
    }
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  decryptRSA(encryptedKey: Buffer): Buffer {
    return crypto.privateDecrypt(
      {
        key: this.privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      encryptedKey,
    );
  }

  decryptAES(encryptedData: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): Buffer {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }

  hash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  verifyAndDecrypt(payload: {
    encryptedFile: string;
    encryptedKey: string;
    iv: string;
    authTag: string;
    hash: string;
  }): { decryptedFile: Buffer; hashVerified: boolean } {
    const encryptedFile = Buffer.from(payload.encryptedFile, 'base64');
    const encryptedKey = Buffer.from(payload.encryptedKey, 'base64');
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');

    this.logger.log('Decrypting AES key with RSA private key...');
    const aesKey = this.decryptRSA(encryptedKey);

    this.logger.log('Decrypting file with AES-256-GCM...');
    const decryptedFile = this.decryptAES(encryptedFile, aesKey, iv, authTag);

    const computedHash = this.hash(decryptedFile);
    const hashVerified = computedHash === payload.hash;
    this.logger.log(`SHA-256 hash verification: ${hashVerified ? 'PASSED' : 'FAILED'}`);
    this.logger.log(`  Expected: ${payload.hash}`);
    this.logger.log(`  Computed: ${computedHash}`);

    return { decryptedFile, hashVerified };
  }
}
