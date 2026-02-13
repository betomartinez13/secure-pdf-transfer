import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class KeysService {
  private readonly logger = new Logger(KeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula el keyId a partir de una clave pública (SHA-256 truncado a 16 caracteres hex)
   */
  computeKeyId(publicKeyPem: string): string {
    const hash = crypto.createHash('sha256').update(publicKeyPem).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Registra una nueva clave pública autorizada
   */
  async registerKey(data: {
    publicKey: string;
    deviceName: string;
    ownerEmail?: string;
  }) {
    const keyId = this.computeKeyId(data.publicKey);

    const existing = await this.prisma.authorizedKey.findUnique({
      where: { keyId },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException(`Key ${keyId} is already registered and active`);
      }
      // Reactivar clave previamente revocada
      this.logger.log(`Reactivating previously revoked key: ${keyId}`);
      return this.prisma.authorizedKey.update({
        where: { keyId },
        data: {
          isActive: true,
          deviceName: data.deviceName,
          ownerEmail: data.ownerEmail,
        },
      });
    }

    this.logger.log(`Registering new authorized key: ${keyId} (${data.deviceName})`);
    return this.prisma.authorizedKey.create({
      data: {
        keyId,
        publicKey: data.publicKey,
        deviceName: data.deviceName,
        ownerEmail: data.ownerEmail,
      },
    });
  }

  /**
   * Lista todas las claves públicas activas
   */
  async getActiveKeys() {
    return this.prisma.authorizedKey.findMany({
      where: { isActive: true },
      select: {
        keyId: true,
        publicKey: true,
        deviceName: true,
        ownerEmail: true,
        createdAt: true,
      },
    });
  }

  /**
   * Lista todas las claves (activas e inactivas)
   */
  async getAllKeys() {
    return this.prisma.authorizedKey.findMany({
      select: {
        keyId: true,
        deviceName: true,
        ownerEmail: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoca una clave por su keyId
   */
  async revokeKey(keyId: string) {
    const key = await this.prisma.authorizedKey.findUnique({
      where: { keyId },
    });

    if (!key) {
      throw new NotFoundException(`Key ${keyId} not found`);
    }

    if (!key.isActive) {
      this.logger.warn(`Key ${keyId} is already revoked`);
      return key;
    }

    this.logger.log(`Revoking key: ${keyId} (${key.deviceName})`);
    return this.prisma.authorizedKey.update({
      where: { keyId },
      data: { isActive: false },
    });
  }

  /**
   * Busca una clave por su keyId
   */
  async findByKeyId(keyId: string) {
    return this.prisma.authorizedKey.findUnique({
      where: { keyId },
    });
  }
}
