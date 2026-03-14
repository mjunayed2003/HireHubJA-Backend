import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';
import * as https from 'https';
import { v4 as uuidv4 } from 'uuid';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InterviewStatus } from '../generated/prisma/client';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────
  // HELPERS — FAC Signature & XML
  // ─────────────────────────────────────────────────────

  private generateFACSignature(
    merchantId: string,
    merchantPassword: string,
    orderId: string,
    amount: string,
    currency: string,
  ): string {
    // FAC signature = MD5(password + merchantId + orderId + amount + currency)
    const raw = merchantPassword + merchantId + orderId + amount + currency;
    return crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
  }

  private buildPaymentXML(params: {
    merchantId: string;
    accessCode: string;
    orderId: string;
    amount: string;
    currency: string;
    signature: string;
    returnUrl: string;
    description: string;
  }): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<FAC_TransactionRequest>
  <TransactionDetails>
    <MerchantId>${params.merchantId}</MerchantId>
    <MerchantPassword>${params.accessCode}</MerchantPassword>
    <TransactionCode>0</TransactionCode>
    <OrderID>${params.orderId}</OrderID>
    <Amount>${params.amount}</Amount>
    <Currency>${params.currency}</Currency>
    <CurrencyExponent>2</CurrencyExponent>
    <ResponseURL>${params.returnUrl}</ResponseURL>
    <Signature>${params.signature}</Signature>
    <Memo>${params.description}</Memo>
  </TransactionDetails>
</FAC_TransactionRequest>`;
  }

  // ─────────────────────────────────────────────────────
  // 1. CREATE PAYMENT URL
  // ─────────────────────────────────────────────────────
  async createPaymentUrl(dto: CreatePaymentDto, employerUserId: string) {
    const employerProfile = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });

    if (!employerProfile) {
      throw new NotFoundException('Employer profile not found');
    }

    const interview = await this.prisma.interview.findUnique({
      where: { id: dto.interviewId },
      include: {
        application: {
          include: {
            job: true,
            jobSeeker: true,
          },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    if (interview.application.job.employerId !== employerProfile.id) {
      throw new ForbiddenException('You are not authorized for this interview');
    }

    if (interview.status !== InterviewStatus.HIRED) {
      throw new BadRequestException('Candidate must be hired before making payment');
    }

    const existingPayment = await this.prisma.payment.findUnique({
      where: { interviewId: dto.interviewId },
    });

    if (existingPayment && existingPayment.status === 'PAID') {
      throw new BadRequestException('Payment already completed for this hire');
    }

    // Amount calculate
    const salaryAmount = parseFloat(interview.application.job.salaryAmount || '0');
    const months = 6;
    const amount = salaryAmount * months;
    const platformFee = amount * 0.10;
    const totalAmount = amount + platformFee;

    const orderId = `ORD-${uuidv4()}`;

    // DB এ PENDING payment save
    await this.prisma.payment.upsert({
      where: { interviewId: dto.interviewId },
      update: { orderId, amount, platformFee, totalAmount, status: 'PENDING' },
      create: {
        orderId,
        amount,
        platformFee,
        totalAmount,
        currency: process.env.FAC_CURRENCY_CODE === '388' ? 'JMD' : 'USD',
        status: 'PENDING',
        employerId: employerProfile.id,
        candidateId: interview.application.jobSeeker.id,
        interviewId: dto.interviewId,
      },
    });

    // FAC config from .env
    const merchantId = process.env.FAC_MERCHANT_ID!;
    const merchantPassword = process.env.FAC_API_PASSWORD!;
    const accessCode = process.env.FAC_ACCESS_CODE!;
    const currencyCode = process.env.FAC_CURRENCY_CODE || '388';
    const facUrl = process.env.FAC_PAYMENT_URL!;
    const returnUrl = process.env.FAC_RETURN_URL!;

    // Amount in cents (no decimal)
    const amountInCents = Math.round(totalAmount * 100).toString();

    // Signature generate
    const signature = this.generateFACSignature(
      merchantId,
      merchantPassword,
      orderId,
      amountInCents,
      currencyCode,
    );

    // Payment URL
    const paymentUrl = `${facUrl}?MerchantId=${merchantId}&AccessCode=${accessCode}&OrderID=${orderId}&Amount=${amountInCents}&Currency=${currencyCode}&Signature=${signature}&ResponseURL=${encodeURIComponent(returnUrl)}`;

    return {
      success: true,
      paymentUrl,
      summary: {
        candidateName: interview.application.jobSeeker.fullName,
        position: interview.application.job.title,
        agreedSalary: salaryAmount,
        months,
        amount,
        platformFee,
        totalAmount,
        currency: currencyCode === '388' ? 'JMD' : 'USD',
        orderId,
      },
    };
  }

  // ─────────────────────────────────────────────────────
  // 2. RETURN URL HANDLER
  // ─────────────────────────────────────────────────────
  async handleReturn(query: Record<string, string>) {
    const { OrderID, ReasonCode, ReasonCodeDesc } = query;

    if (!OrderID) {
      throw new BadRequestException('Invalid return data');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { orderId: OrderID },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // ReasonCode "1" = success
    if (ReasonCode === '1') {
      await this.prisma.payment.update({
        where: { orderId: OrderID },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          transactionId: query.TransactionId || null,
        },
      });

      const frontendSuccess = process.env.FRONTEND_SUCCESS_URL || 'http://localhost:3000/payment/success';
      return { redirect: `${frontendSuccess}?orderId=${OrderID}` };
    } else {
      await this.prisma.payment.update({
        where: { orderId: OrderID },
        data: { status: 'FAILED' },
      });

      const frontendFailed = process.env.FRONTEND_FAILED_URL || 'http://localhost:3000/payment/failed';
      return { redirect: `${frontendFailed}?orderId=${OrderID}&reason=${ReasonCodeDesc || 'Payment failed'}` };
    }
  }

  // ─────────────────────────────────────────────────────
  // 3. PAYMENT STATUS CHECK
  // ─────────────────────────────────────────────────────
  async getPaymentStatus(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      select: {
        status: true,
        totalAmount: true,
        currency: true,
        paidAt: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return { success: true, data: payment };
  }

  // ─────────────────────────────────────────────────────
  // 4. MY PAYMENTS (Employer)
  // ─────────────────────────────────────────────────────
  async getMyPayments(employerUserId: string) {
    const employerProfile = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });

    if (!employerProfile) {
      throw new NotFoundException('Employer profile not found');
    }

    const payments = await this.prisma.payment.findMany({
      where: { employerId: employerProfile.id },
      include: {
        candidate: { select: { fullName: true, profilePic: true } },
        interview: {
          include: {
            application: {
              include: { job: { select: { title: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: payments };
  }
}