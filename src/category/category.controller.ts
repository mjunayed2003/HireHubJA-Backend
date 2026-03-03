import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateCategoryDto } from './dto/category.dto';



@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async getAllCategories() {
    return this.categoryService.getAllCategories();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createCategory(@Body() body: CreateCategoryDto) {
    return this.categoryService.createCategory(
      body.name,
      body.description,
      body.image,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }
}