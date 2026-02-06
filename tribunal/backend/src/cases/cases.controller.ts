import { Controller, Post, Get, Param, Body, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { CasesService } from './cases.service';
import { CryptoService } from '../crypto/crypto.service';

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
    encryptedKey: string;
    iv: string;
    authTag: string;
    hash: string;
  }) {
    this.logger.log(`Receiving encrypted case: ${body.caseName}`);
    this.logger.log('Storing case encrypted in database (on-demand decryption enabled)');

    const saved = await this.casesService.create({
      caseName: body.caseName,
      fileName: body.fileName,
      encryptedFile: body.encryptedFile,
      encryptedKey: body.encryptedKey,
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

    const { decryptedFile, hashVerified } = this.cryptoService.verifyAndDecrypt({
      encryptedFile: Buffer.from(caseRecord.encryptedFile).toString('base64'),
      encryptedKey: caseRecord.encryptedKey,
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
