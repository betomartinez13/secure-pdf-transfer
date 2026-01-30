import { Module } from '@nestjs/common';
import { CasesModule } from './cases/cases.module';
import { CryptoModule } from './crypto/crypto.module';

@Module({
  imports: [CasesModule, CryptoModule],
})
export class AppModule {}
