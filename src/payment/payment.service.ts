import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InterviewStatus } from '../generated/prisma/client';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // 1. PAYMENT URL  (Employer call )
  // ============================================
  async createPaymentUrl(dto: CreatePaymentDto, employerUserId: string) {
    // find Employer  profile 
    const employerProfile = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });

    if (!employerProfile) {
      throw new NotFoundException('Employer profile not found');
    }

    // Find Interview — application, job, jobSeeker
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

    // Interview HIRED status chack
    if (interview.status !== InterviewStatus.HIRED) {
      throw new BadRequestException('Candidate must be hired before making payment');
    }

    // Already PAID payment check
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
    const platformFee = amount * 0.10; // 10%
    const totalAmount = amount + platformFee;

    // Unique orderId
    const orderId = `ORD-${uuidv4()}`;

    // DB  PENDING payment create 
    await this.prisma.payment.upsert({
      where: { interviewId: dto.interviewId },
      update: {
        orderId,
        amount,
        platformFee,
        totalAmount,
        status: 'PENDING',
      },
      create: {
        orderId,
        amount,
        platformFee,
        totalAmount,
        currency: 'JMD',
        status: 'PENDING',
        employerId: employerProfile.id,
        candidateId: interview.application.jobSeeker.id,
        interviewId: dto.interviewId,
      },
    });

    // Fygaro JWT 
    const payload = {
      amount: totalAmount.toFixed(2),
      currency: 'JMD',
      custom_reference: orderId,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    const header = {
      alg: 'HS256' as const,
      typ: 'JWT',
      kid: process.env.FYGARO_API_KEY,
    };

    const token = jwt.sign(payload, process.env.FYGARO_SECRET!, { header });
    const paymentUrl = `${process.env.FYGARO_BUTTON_URL}?jwt=${token}`;

    return {
      paymentUrl,
      summary: {
        candidateName: interview.application.jobSeeker.fullName,
        position: interview.application.job.title,
        agreedSalary: salaryAmount,
        months,
        amount,
        platformFee,
        totalAmount,
        currency: 'JMD',
        orderId,
      },
    };
  }

  // ============================================
  // 2. WEBHOOK — Fygaro automatically call 
  // ============================================
  async handleWebhook(rawBody: string, signature: string, keyId: string) {
    // Signature verify
    if (!signature || !keyId) {
      throw new BadRequestException('Missing Fygaro headers');
    }

    const parts = signature.split(',');
    const t = parts.find((p) => p.startsWith('t='))?.split('=')[1];
    const v1 = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

    if (!t || !v1) {
      throw new BadRequestException('Malformed signature header');
    }

    // Replay attack  — 5 min  reject
    if (Math.abs(Date.now() / 1000 - parseInt(t)) > 300) {
      throw new BadRequestException('Stale timestamp — possible replay attack');
    }

    // HMAC verify 
    const secret = process.env.FYGARO_SECRET!;
    const message = `${t}.${rawBody}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))) {
      throw new BadRequestException('Invalid signature');
    }

    // Payload parse 
    const payload = JSON.parse(rawBody);
    const { transactionId, customReference, amount } = payload;

    // Duplicate webhook check — same transactionId
    const existingLog = await this.prisma.webhookLog.findUnique({
      where: { transactionId },
    });

    if (existingLog) {
      // Already processed 
      return { received: true };
    }

    // Find payment record by orderId 
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: customReference },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    // Amount verify  — tamper check
if (
  parseFloat(payment.totalAmount.toString()).toFixed(2) !==
  parseFloat(amount).toFixed(2)
) {
      throw new BadRequestException('Amount mismatch — possible tampering');
    }

    // DB update  — Prisma Transaction use  (atomic)
    await this.prisma.$transaction([
      // Payment status PAID 
      this.prisma.payment.update({
        where: { orderId: customReference },
        data: {
          status: 'PAID',
          transactionId,
          paidAt: new Date(),
          webhookReceivedAt: new Date(),
        },
      }),

      // Webhook log save  (duplicate)
      this.prisma.webhookLog.create({
        data: {
          transactionId,
          rawPayload: payload,
          paymentId: payment.id,
        },
      }),
    ]);

    return { received: true };
  }

  // ============================================
  // 3. PAYMENT STATUS CHECK (Success page এ)
  // ============================================
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

    return payment;
  }

  // ============================================
  // 4. EMPLOYER  PAYMENT 
  // ============================================
  async getMyPayments(employerUserId: string) {
    const employerProfile = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });

    if (!employerProfile) {
      throw new NotFoundException('Employer profile not found');
    }

    return this.prisma.payment.findMany({
      where: { employerId: employerProfile.id },
      include: {
        candidate: {
          select: { fullName: true, profilePic: true },
        },
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
  }
}