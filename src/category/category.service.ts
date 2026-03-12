import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────
  // GET ALL — Public
  // ─────────────────────────────────────────────────────
  async getAllCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        image: true,
        description: true,
      },
    });
  }

  // ─────────────────────────────────────────────────────
  // CREATE — Admin
  // ─────────────────────────────────────────────────────
  async createCategory(name: string, description?: string, image?: string) {
    const existing = await this.prisma.category.findUnique({ where: { name } });
    if (existing) throw new ConflictException('Category name already exists');

    return this.prisma.category.create({
      data: { name, description, image },
    });
  }

  // ─────────────────────────────────────────────────────
  // UPDATE — Admin
  // ─────────────────────────────────────────────────────
  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    // Same name অন্য category তে আছে কিনা check
    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.category.findUnique({
        where: { name: dto.name },
      });
      if (existing) throw new ConflictException('Category name already exists');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name ?? category.name,
        description: dto.description ?? category.description,
        image: dto.image ?? category.image,
      },
    });
  }

  // ─────────────────────────────────────────────────────
  // DELETE — Admin
  // ─────────────────────────────────────────────────────
  async deleteCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { jobs: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (category._count.jobs > 0) {
      throw new ConflictException(
        `Cannot delete. ${category._count.jobs} job(s) are using this category`,
      );
    }

    return this.prisma.category.delete({ where: { id } });
  }
}