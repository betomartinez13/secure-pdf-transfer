import { Module } from '@nestjs/common';
import { CryptoController } from './crypto.controller';
import { CryptoService } from './crypto.service';
import { KeysModule } from '../keys/keys.module';

@Module({
  imports: [KeysModule],
  controllers: [CryptoController],
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
