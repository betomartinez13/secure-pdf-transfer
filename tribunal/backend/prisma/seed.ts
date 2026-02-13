import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Calcula el keyId a partir de una clave pública (SHA-256 truncado a 16 caracteres hex)
 */
function computeKeyId(publicKeyPem: string): string {
  const hash = crypto.createHash('sha256').update(publicKeyPem).digest('hex');
  return hash.substring(0, 16);
}

async function main() {
  console.log('🔐 Seeding authorized keys...');

  // Intentar cargar la clave pública del tribunal
  const keysDir = process.env.KEYS_DIR || '/app/keys';
  const publicKeyPath = path.join(keysDir, 'tribunal_public.pem');

  if (!fs.existsSync(publicKeyPath)) {
    console.log('⚠️  No public key found at', publicKeyPath);
    console.log('   The key will be generated when the backend starts.');
    console.log('   Run seed again after starting the backend to register it.');
    return;
  }

  const publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
  const keyId = computeKeyId(publicKey);

  console.log(`📍 Found public key with keyId: ${keyId}`);

  // Verificar si ya existe
  const existing = await prisma.authorizedKey.findUnique({
    where: { keyId },
  });

  if (existing) {
    console.log(`✅ Key ${keyId} already registered (device: ${existing.deviceName})`);

    // Asegurar que esté activa
    if (!existing.isActive) {
      await prisma.authorizedKey.update({
        where: { keyId },
        data: { isActive: true },
      });
      console.log(`   Reactivated key ${keyId}`);
    }

    return;
  }

  // Registrar la clave inicial
  const deviceName = process.env.DEVICE_NAME || 'tribunal-primary';

  await prisma.authorizedKey.create({
    data: {
      keyId,
      publicKey,
      deviceName,
      ownerEmail: process.env.OWNER_EMAIL || null,
      isActive: true,
    },
  });

  console.log(`✅ Registered initial key: ${keyId} (device: ${deviceName})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
