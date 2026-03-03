import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // URL: GET /public/about_us
  @Get(':key')
  async getContent(@Param('key') key: string) {
    return this.publicService.getContent(key);
  }
}