import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    caseName: string;
    fileName: string;
    encryptedFile: string;
    encryptedKey: string;
    iv: string;
    authTag: string;
    hash: string;
  }) {
    return this.prisma.case.create({
      data: {
        caseName: data.caseName,
        fileName: data.fileName,
        encryptedFile: Buffer.from(data.encryptedFile, 'base64'),
        encryptedKey: data.encryptedKey,
        iv: data.iv,
        authTag: data.authTag,
        hash: data.hash,
      },
    });
  }

  async findAll() {
    return this.prisma.case.findMany({
      select: {
        id: true,
        caseName: true,
        fileName: true,
        hash: true,
        receivedAt: true,
      },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.case.findUniqueOrThrow({ where: { id } });
  }
}
