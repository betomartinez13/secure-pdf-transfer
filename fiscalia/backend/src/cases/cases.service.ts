import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);
  private readonly tribunalUrl = process.env.TRIBUNAL_URL || 'http://tribunal-backend:4001';

  constructor(private readonly cryptoService: CryptoService) {}

  async encryptAndSend(caseName: string, file: Express.Multer.File) {
    // 1. Fetch public key
    this.logger.log('Fetching Tribunal public key...');
    const { data: keyResponse } = await axios.get(`${this.tribunalUrl}/crypto/public-key`);
    const publicKeyPem: string = keyResponse.publicKey;

    // 2. Encrypt
    const payload = this.cryptoService.createSecurePayload(file.buffer, publicKeyPem);

    // 3. Send
    this.logger.log('Sending encrypted payload to Tribunal...');
    const { data: result } = await axios.post(`${this.tribunalUrl}/cases/receive`, {
      caseName,
      fileName: file.originalname,
      ...payload,
    });

    return {
      success: true,
      message: `Case "${caseName}" sent successfully.`,
      hash: payload.hash,
      caseId: result.id,
      storedEncrypted: true,
    };
  }
}
