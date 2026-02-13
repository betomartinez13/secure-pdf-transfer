import { Controller, Post, Get, Param, Body, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { CasesService } from './cases.service';
import { CryptoService, EncryptedKeyEntry } from '../crypto/crypto.service';

@Controller('cases')
export class CasesController {
  private readonly logger = new Logger(CasesController.name);

  constructor(
    private readonly casesService: CasesService,
    private readonly cryptoService: CryptoService,
  ) {}

  @Post('receive')
  async receiveCase(@Body() body: {
    caseName: string;
    fileName: string;
    encryptedFile: string;
    encryptedKey?: string;              // Legacy: single recipient
    encryptedKeys?: EncryptedKeyEntry[]; // Multi-recipient
    iv: string;
    authTag: string;
    hash: string;
  }) {
    this.logger.log(`Receiving encrypted case: ${body.caseName}`);

    if (body.encryptedKeys) {
      this.logger.log(`Multi-recipient payload with ${body.encryptedKeys.length} authorized keys`);
    }

    this.logger.log('Storing case encrypted in database (on-demand decryption enabled)');

    // Para multi-recipient, almacenamos encryptedKeys como JSON string
    // Para legacy, usamos encryptedKey directamente
    const encryptedKeyToStore = body.encryptedKeys
      ? JSON.stringify(body.encryptedKeys)
      : body.encryptedKey;

    const saved = await this.casesService.create({
      caseName: body.caseName,
      fileName: body.fileName,
      encryptedFile: body.encryptedFile,
      encryptedKey: encryptedKeyToStore,
      iv: body.iv,
      authTag: body.authTag,
      hash: body.hash,
    });

    this.logger.log(`Case stored encrypted with id=${saved.id}`);
    return { success: true, id: saved.id };
  }

  @Get()
  async listCases() {
    return this.casesService.findAll();
  }

  @Get(':id/download')
  async downloadCase(@Param('id') id: string, @Res() res: Response) {
    const caseRecord = await this.casesService.findOne(parseInt(id, 10));

    this.logger.log(`On-demand decryption requested for case id=${id}`);

    // Detectar si es multi-recipient (JSON array) o legacy (base64 string)
    let encryptedKey: string | undefined;
    let encryptedKeys: EncryptedKeyEntry[] | undefined;

    try {
      const parsed = JSON.parse(caseRecord.encryptedKey);
      if (Array.isArray(parsed)) {
        encryptedKeys = parsed;
        this.logger.log(`Multi-recipient case detected with ${encryptedKeys.length} keys`);
      } else {
        encryptedKey = caseRecord.encryptedKey;
      }
    } catch {
      // No es JSON, es legacy base64 string
      encryptedKey = caseRecord.encryptedKey;
    }

    const { decryptedFile, hashVerified } = this.cryptoService.verifyAndDecrypt({
      encryptedFile: Buffer.from(caseRecord.encryptedFile).toString('base64'),
      encryptedKey,
      encryptedKeys,
      iv: caseRecord.iv,
      authTag: caseRecord.authTag,
      hash: caseRecord.hash,
    });

    if (!hashVerified) {
      this.logger.warn(`Hash verification failed for case id=${id}`);
    }

    this.logger.log(`Case id=${id} decrypted successfully, sending to client`);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${caseRecord.fileName}"`,
      'X-Hash-Verified': hashVerified.toString(),
    });
    res.send(decryptedFile);
  }
}
