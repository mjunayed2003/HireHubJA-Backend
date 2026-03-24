import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CategoryService } from './category.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/admin/admin-auth/guards/roles.guard';
import { Roles } from 'src/admin/admin-auth/decorators/roles.decorator';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { UserRole } from 'src/generated/prisma/client';

// Multer Storage Configuration
const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

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
  @UseInterceptors(FileInterceptor('image', { storage }))
  async createCategory(
    @Body() body: CreateCategoryDto,
    @UploadedFile() imageFile: Express.Multer.File,
  ) {
    return this.categoryService.createCategory(body, imageFile);
  }

  // ─────────────────────────────────────────────────────
  // PUT /categories/:id — Admin only
  // ─────────────────────────────────────────────────────
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image', { storage }))
  async updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
    @UploadedFile() imageFile: Express.Multer.File,
  ) {
    return this.categoryService.updateCategory(id, body, imageFile);
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