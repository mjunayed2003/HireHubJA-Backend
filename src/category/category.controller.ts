import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/admin/admin-auth/guards/roles.guard';
import { Roles } from 'src/admin/admin-auth/decorators/roles.decorator';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { UserRole } from 'src/generated/prisma/client';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // ─────────────────────────────────────────────────────
  // GET /categories — Public
  // ─────────────────────────────────────────────────────
  @Get()
  async getAllCategories() {
    return this.categoryService.getAllCategories();
  }

  // ─────────────────────────────────────────────────────
  // POST /categories — Admin only
  // ─────────────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createCategory(@Body() body: CreateCategoryDto) {
    return this.categoryService.createCategory(
      body.name,
      body.description,
      body.image,
    );
  }

  // ─────────────────────────────────────────────────────
  // PUT /categories/:id — Admin only
  // ─────────────────────────────────────────────────────
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.categoryService.updateCategory(id, body);
  }

  // ─────────────────────────────────────────────────────
  // DELETE /categories/:id — Admin only
  // ─────────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }
}