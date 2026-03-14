import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ============================================
  // 1. CREATE PAYMENT URL
  // ============================================
  @UseGuards(JwtAuthGuard)
  @Post('create-url')
  async createPaymentUrl(
    @Body() dto: CreatePaymentDto,
    @Request() req,
  ) {
    return this.paymentService.createPaymentUrl(dto, req.user.id);
  }

  // ============================================
  // 2. FAC RETURN URL
  // ============================================
  @Get('return')
  async handleReturn(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const result = await this.paymentService.handleReturn(query);
    return res.redirect(result.redirect);
  }

  // ============================================
  // 3. PAYMENT STATUS CHECK
  // ============================================
  @Get('status/:orderId')
  async getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentStatus(orderId);
  }

  // ============================================
  // 4. MY PAYMENTS (Employer)
  // ============================================
  @UseGuards(JwtAuthGuard)
  @Get('my-payments')
  async getMyPayments(@Request() req) {
    return this.paymentService.getMyPayments(req.user.id);
  }
}