import { Controller, Get, Post, Delete, Body, Param, Logger } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { KeysService } from '../keys/keys.service';

@Controller('crypto')
export class CryptoController {
  private readonly logger = new Logger(CryptoController.name);

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly keysService: KeysService,
  ) {}

  /**
   * GET /crypto/public-key - Legacy: retorna solo la clave pública de esta instancia
   */
  @Get('public-key')
  getPublicKey() {
    return { publicKey: this.cryptoService.getPublicKey() };
  }

  /**
   * GET /crypto/public-keys - Retorna todas las claves públicas activas
   */
  @Get('public-keys')
  async getPublicKeys() {
    const keys = await this.keysService.getActiveKeys();
    return {
      keys: keys.map(k => ({
        keyId: k.keyId,
        publicKey: k.publicKey,
        deviceName: k.deviceName,
      })),
    };
  }

  /**
   * GET /crypto/my-key-id - Retorna el keyId de esta instancia
   */
  @Get('my-key-id')
  getMyKeyId() {
    return {
      keyId: this.cryptoService.getMyKeyId(),
      publicKey: this.cryptoService.getPublicKey(),
    };
  }

  /**
   * POST /crypto/register-key - Registra una nueva clave pública autorizada
   */
  @Post('register-key')
  async registerKey(
    @Body() body: { publicKey: string; deviceName: string; ownerEmail?: string },
  ) {
    this.logger.log(`Registering new key for device: ${body.deviceName}`);
    const result = await this.keysService.registerKey({
      publicKey: body.publicKey,
      deviceName: body.deviceName,
      ownerEmail: body.ownerEmail,
    });
    return {
      success: true,
      keyId: result.keyId,
      deviceName: result.deviceName,
      message: `Key registered successfully with keyId: ${result.keyId}`,
    };
  }

  /**
   * DELETE /crypto/revoke-key/:keyId - Revoca una clave autorizada
   */
  @Delete('revoke-key/:keyId')
  async revokeKey(@Param('keyId') keyId: string) {
    this.logger.log(`Revoking key: ${keyId}`);
    const result = await this.keysService.revokeKey(keyId);
    return {
      success: true,
      keyId: result.keyId,
      deviceName: result.deviceName,
      message: `Key ${keyId} has been revoked`,
    };
  }

  /**
   * GET /crypto/keys - Lista todas las claves (activas e inactivas) para administración
   */
  @Get('keys')
  async listAllKeys() {
    return this.keysService.getAllKeys();
  }
}
