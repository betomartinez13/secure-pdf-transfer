import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CryptoService, Recipient } from '../crypto/crypto.service';

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);
  private readonly tribunalUrl = process.env.TRIBUNAL_URL || 'http://tribunal-backend:4001';

  constructor(private readonly cryptoService: CryptoService) {}

  async encryptAndSend(caseName: string, file: Express.Multer.File) {
    // 1. Fetch all authorized public keys
    this.logger.log('Fetching Tribunal authorized public keys...');

    let recipients: Recipient[];

    try {
      // Intentar nuevo endpoint multi-recipient
      const { data: keysResponse } = await axios.get(`${this.tribunalUrl}/crypto/public-keys`);

      if (keysResponse.keys && keysResponse.keys.length > 0) {
        recipients = keysResponse.keys.map((k: { keyId: string; publicKey: string }) => ({
          keyId: k.keyId,
          publicKey: k.publicKey,
        }));
        this.logger.log(`Found ${recipients.length} authorized recipient(s)`);
      } else {
        // Si no hay claves registradas, usar fallback al endpoint legacy
        this.logger.warn('No authorized keys found, falling back to legacy single-key mode');
        const { data: keyResponse } = await axios.get(`${this.tribunalUrl}/crypto/public-key`);
        const publicKeyPem: string = keyResponse.publicKey;

        // Usar el método legacy que retorna encryptedKey en lugar de encryptedKeys
        const payload = this.cryptoService.createSecurePayloadLegacy(file.buffer, publicKeyPem);

        this.logger.log('Sending encrypted payload to Tribunal (legacy mode)...');
        const { data: result } = await axios.post(`${this.tribunalUrl}/cases/receive`, {
          caseName,
          fileName: file.originalname,
          ...payload,
        });

        return {
          success: true,
          message: `Case "${caseName}" sent successfully (legacy mode).`,
          hash: payload.hash,
          caseId: result.id,
          storedEncrypted: true,
          recipientCount: 1,
        };
      }
    } catch (error) {
      // Fallback al endpoint antiguo si el nuevo no existe
      this.logger.warn('Failed to fetch public-keys, falling back to legacy endpoint');
      const { data: keyResponse } = await axios.get(`${this.tribunalUrl}/crypto/public-key`);
      const publicKeyPem: string = keyResponse.publicKey;

      const payload = this.cryptoService.createSecurePayloadLegacy(file.buffer, publicKeyPem);

      this.logger.log('Sending encrypted payload to Tribunal (legacy mode)...');
      const { data: result } = await axios.post(`${this.tribunalUrl}/cases/receive`, {
        caseName,
        fileName: file.originalname,
        ...payload,
      });

      return {
        success: true,
        message: `Case "${caseName}" sent successfully (legacy mode).`,
        hash: payload.hash,
        caseId: result.id,
        storedEncrypted: true,
        recipientCount: 1,
      };
    }

    // 2. Encrypt for all recipients
    const payload = this.cryptoService.createSecurePayload(file.buffer, recipients);

    // 3. Send
    this.logger.log(`Sending encrypted payload to Tribunal for ${recipients.length} recipient(s)...`);
    const { data: result } = await axios.post(`${this.tribunalUrl}/cases/receive`, {
      caseName,
      fileName: file.originalname,
      ...payload,
    });

    return {
      success: true,
      message: `Case "${caseName}" sent successfully to ${recipients.length} authorized device(s).`,
      hash: payload.hash,
      caseId: result.id,
      storedEncrypted: true,
      recipientCount: recipients.length,
    };
  }
}
