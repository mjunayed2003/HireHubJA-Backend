import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ============================================
  // 1. PAYMENT URL
  // POST /payment/create-url
  // Employer only (JWT protected)
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
  // 2. WEBHOOK — Fygaro automatically POST
  // POST /payment/webhook
  // Public — No JWT (Fygaro call )
  // ============================================
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: any,
    @Headers('fygaro-signature') signature: string,
    @Headers('fygaro-key-id') keyId: string,
  ) {
    // rawBody main.ts
    const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);
    return this.paymentService.handleWebhook(rawBody, signature, keyId);
  }

  // ============================================
  // 3. PAYMENT STATUS CHECK
  // GET /payment/status/:orderId
  // Success page এ verify 
  // ============================================
  @Get('status/:orderId')
  async getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentStatus(orderId);
  }

  // ============================================
  // 4. EMPLOYER  PAYMENT
  // GET /payment/my-payments
  // ============================================
  @UseGuards(JwtAuthGuard)
  @Get('my-payments')
  async getMyPayments(@Request() req) {
    return this.paymentService.getMyPayments(req.user.id);
  }
}