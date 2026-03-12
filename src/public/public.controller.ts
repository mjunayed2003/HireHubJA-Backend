import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PublicService } from './public.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/admin/admin-auth/guards/roles.guard';
import { Roles } from 'src/admin/admin-auth/decorators/roles.decorator';
import { UserRole } from 'src/generated/prisma/client';
import { UpdateCmsDto } from './dto/update-cms.dto';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get(':key')
  async getContent(@Param('key') key: string) {
    return this.publicService.getContent(key);
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateContent(
    @Param('key') key: string,
    @Body() dto: UpdateCmsDto,
  ) {
    return this.publicService.updateContent(key, dto);
  }
}