import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  // Public: Get all categories (for dropdown)
  async getAllCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        image: true,
      },
    });
  }

  // Admin: Create category
  async createCategory(name: string, description?: string, image?: string) {
    return this.prisma.category.create({
      data: { name, description, image },
    });
  }

  // Admin: Delete category
  async deleteCategory(id: string) {
    return this.prisma.category.delete({
      where: { id },
    });
  }
}