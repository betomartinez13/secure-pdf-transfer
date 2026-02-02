import { Controller, Get } from '@nestjs/common';
import { CryptoService } from './crypto.service';

@Controller('crypto')
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  @Get('public-key')
  getPublicKey() {
    return { publicKey: this.cryptoService.getPublicKey() };
  }
}
