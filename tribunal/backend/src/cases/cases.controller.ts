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

    const { decryptedFile, hashVerified } = this.cryptoService.verifyAndDecrypt(body);

    const saved = await this.casesService.create({
      caseName: body.caseName,
      fileName: body.fileName,
      fileData: decryptedFile,
      hash: body.hash,
      hashVerified,
    });

    this.logger.log(`Case stored with id=${saved.id}, hashVerified=${hashVerified}`);
    return { success: true, id: saved.id, hashVerified };
  }

  @Get()
  async listCases() {
    return this.casesService.findAll();
  }

  @Get(':id/download')
  async downloadCase(@Param('id') id: string, @Res() res: Response) {
    const caseRecord = await this.casesService.findOne(parseInt(id, 10));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${caseRecord.fileName}"`,
    });
    res.send(caseRecord.fileData);
  }
}
