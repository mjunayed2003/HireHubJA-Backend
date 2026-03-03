import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async getContent(key: string) {
    const content = await this.prisma.systemContent.findUnique({
      where: { key },
    });
    if (!content) throw new NotFoundException('Content not found');
    return content;
  }
}