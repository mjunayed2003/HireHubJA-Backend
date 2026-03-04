import {
  Controller, Get, Post, Delete,
  Param, Body, Request, UseGuards,
  UploadedFile, UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { MessagesService } from './messages.service';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // 1. GET OR CREATE CONVERSATION
  // URL: POST /messages/conversation
  @Post('conversation')
  async getOrCreateConversation(
    @Body() body: { targetUserId: string },
    @Request() req,
  ) {
    return this.messagesService.getOrCreateConversation(
      req.user.id,
      body.targetUserId,
    );
  }

  // 2. GET ALL CONVERSATIONS (Inbox)
  // URL: GET /messages/conversations
  @Get('conversations')
  async getConversations(@Request() req) {
    return this.messagesService.getConversations(req.user.id);
  }

  // 3. GET MESSAGES IN A CONVERSATION
  // URL: GET /messages/conversation/:id
  @Get('conversation/:id')
  async getMessages(@Param('id') id: string, @Request() req) {
    return this.messagesService.getMessages(id, req.user.id);
  }

  // 4. UPLOAD ATTACHMENT
  // URL: POST /messages/upload
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `attachment-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadAttachment(@UploadedFile() file: Express.Multer.File) {
    return {
      url: `/uploads/${file.filename}`,
    };
  }

  // 5. UNREAD COUNT
  // URL: GET /messages/unread-count
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.messagesService.getUnreadCount(req.user.id);
  }

  // 6. DELETE MESSAGE
  // URL: DELETE /messages/:id
  @Delete(':id')
  async deleteMessage(@Param('id') id: string, @Request() req) {
    return this.messagesService.deleteMessage(id, req.user.id);
  }
}