import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCmsDto } from './dto/update-cms.dto';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────
  // GET CONTENT — Public
  // ─────────────────────────────────────────────────────
  async getContent(key: string) {
    const content = await this.prisma.systemContent.findUnique({
      where: { key },
    });
    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  // ─────────────────────────────────────────────────────
  // UPDATE CONTENT — Admin only
  // ─────────────────────────────────────────────────────
  async updateContent(key: string, dto: UpdateCmsDto) {
    const content = await this.prisma.systemContent.upsert({
      where: { key },
      update: {
        title: dto.title,
        content: dto.content,
      },
      create: {
        key,
        title: dto.title,
        content: dto.content,
      },
    });

    return {
      success: true,
      message: 'Content updated successfully',
      data: content,
    };
  }
}