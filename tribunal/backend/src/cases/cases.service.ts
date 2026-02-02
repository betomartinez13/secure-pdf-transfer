import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    caseName: string;
    fileName: string;
    fileData: Buffer;
    hash: string;
    hashVerified: boolean;
  }) {
    return this.prisma.case.create({
      data: {
        ...data,
        fileData: Uint8Array.from(data.fileData),
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
        hashVerified: true,
        receivedAt: true,
      },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.case.findUniqueOrThrow({ where: { id } });
  }
}
