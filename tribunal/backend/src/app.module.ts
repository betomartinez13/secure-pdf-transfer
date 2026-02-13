import { Module } from '@nestjs/common';
import { CasesModule } from './cases/cases.module';
import { CryptoModule } from './crypto/crypto.module';
import { PrismaModule } from './prisma/prisma.module';
import { KeysModule } from './keys/keys.module';

@Module({
  imports: [PrismaModule, CryptoModule, CasesModule, KeysModule],
})
export class AppModule {}
