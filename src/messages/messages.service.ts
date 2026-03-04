import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) { }

  // ==================================================
  // 1. GET OR CREATE CONVERSATION
  // ==================================================
  async getOrCreateConversation(userId1: string, userId2: string) {
    // Check if conversation already exists
    const existing = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: userId1 } } },
          { participants: { some: { userId: userId2 } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                role: true,
                jobSeekerProfile: { select: { fullName: true, profilePic: true } },
                employerProfile: { select: { fullName: true, profilePic: true } },
              },
            },
          },
        },
      },
    });

    if (existing) return existing;

    // Create new conversation
    return this.prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: userId1 },
            { userId: userId2 },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                role: true,
                jobSeekerProfile: { select: { fullName: true, profilePic: true } },
                employerProfile: { select: { fullName: true, profilePic: true } },
              },
            },
          },
        },
      },
    });
  }

  // ==================================================
  // 2. GET ALL CONVERSATIONS (Inbox)
  // ==================================================
  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                role: true,
                jobSeekerProfile: { select: { fullName: true, profilePic: true } },
                employerProfile: { select: { fullName: true, profilePic: true } },
              },
            },
          },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1, // Last message only
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations;
  }

  // ==================================================
  // 3. GET MESSAGES IN A CONVERSATION
  // ==================================================
  async getMessages(conversationId: string, userId: string) {
    // Check if user is participant
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) throw new NotFoundException('Conversation not found');

    // Mark all messages as read
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        isRead: false,
        senderId: { not: userId },
      },
      data: { isRead: true },
    });

    return this.prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            jobSeekerProfile: { select: { fullName: true, profilePic: true } },
            employerProfile: { select: { fullName: true, profilePic: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ==================================================
  // 4. SEND MESSAGE
  // ==================================================
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    attachmentUrl?: string,
  ) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: senderId },
      },
    });

    if (!participant) throw new NotFoundException('Conversation not found');

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        attachmentUrl: attachmentUrl ?? null,
        isRead: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            jobSeekerProfile: { select: { fullName: true, profilePic: true } },
            employerProfile: { select: { fullName: true, profilePic: true } },
          },
        },
      },
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  // ==================================================
  // 5. DELETE MESSAGE (Soft Delete)
  // ==================================================
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, senderId: userId },
    });

    if (!message) throw new NotFoundException('Message not found');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });
  }

  // ==================================================
  // 6. UNREAD COUNT
  // ==================================================
  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        conversation: {
          participants: { some: { userId } },
        },
        isRead: false,
        isDeleted: false,
        senderId: { not: userId },
      },
    });

    return { unreadCount: count };
  }



  async getConversationParticipants(conversationId: string) {
    return this.prisma.conversationParticipant.findMany({
      where: { conversationId },
    });
  }
}