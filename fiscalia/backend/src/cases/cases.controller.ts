import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CasesService } from './cases.service';

@Controller('cases')
export class CasesController {
  private readonly logger = new Logger(CasesController.name);

  constructor(private readonly casesService: CasesService) {}

  @Post('send')
  @UseInterceptors(FileInterceptor('file'))
  async sendCase(
    @UploadedFile() file: Express.Multer.File,
    @Body('caseName') caseName: string,
  ) {
    this.logger.log(`Sending case "${caseName}" (file: ${file.originalname}, size: ${file.size} bytes)`);
    return this.casesService.encryptAndSend(caseName, file);
  }
}
