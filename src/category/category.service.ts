import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

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
  async createCategory(dto: CreateCategoryDto, imageFile?: Express.Multer.File) {
    const existing = await this.prisma.category.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Category name already exists');
    const imageUrl = imageFile ? `/uploads/${imageFile.filename}` : undefined;

    return this.prisma.category.create({
      data: { 
        name: dto.name, 
        description: dto.description, 
        image: imageUrl 
      },
    });
  }

  // ─────────────────────────────────────────────────────
  // UPDATE — Admin
  // ─────────────────────────────────────────────────────
  async updateCategory(id: string, dto: UpdateCategoryDto, imageFile?: Express.Multer.File) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.category.findUnique({
        where: { name: dto.name },
      });
      if (existing) throw new ConflictException('Category name already exists');
    }

    const imageUrl = imageFile ? `/uploads/${imageFile.filename}` : undefined;

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name ?? category.name,
        description: dto.description ?? category.description,
        ...(imageUrl && { image: imageUrl }),
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
    if (category._count?.jobs > 0) {
      throw new ConflictException(
        `Cannot delete. ${category._count.jobs} job(s) are using this category`,
      );
    }

    return this.prisma.category.delete({ where: { id } });
  }
}