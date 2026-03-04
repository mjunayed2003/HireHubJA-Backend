import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody,
  ConnectedSocket, OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId → socketId

  constructor(
    private messagesService: MessagesService,
    private jwtService: JwtService,
  ) {}

  // ==================================================
  // CONNECTION — connect হলে conversations load হবে
  // ==================================================
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ||
                    client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      client.data.userId = payload.sub;
      this.connectedUsers.set(payload.sub, client.id);

      // ✅ Connect হলে সব conversations load করুন
      const conversations = await this.messagesService.getConversations(payload.sub);
      client.emit('conversations', conversations);

      // ✅ Unread count পাঠান
      const unreadCount = await this.messagesService.getUnreadCount(payload.sub);
      client.emit('unread_count', unreadCount);

      console.log(`✅ User connected: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      console.log(`❌ User disconnected: ${userId}`);
    }
  }

  // ==================================================
  // JOIN CONVERSATION — messages load হবে
  // ==================================================
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.conversationId);

    // ✅ সব messages load করুন
    const messages = await this.messagesService.getMessages(
      data.conversationId,
      client.data.userId,
    );
    client.emit('conversation_messages', messages);

    // ✅ Read হওয়ার পর unread count update করুন
    const unreadCount = await this.messagesService.getUnreadCount(client.data.userId);
    client.emit('unread_count', unreadCount);
  }

  // ==================================================
  // SEND MESSAGE — real-time
  // ==================================================
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: { conversationId: string; content: string; attachmentUrl?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.messagesService.sendMessage(
      data.conversationId,
      client.data.userId,
      data.content,
      data.attachmentUrl,
    );

    // ✅ Conversation room এ সবাই new_message পাবে
    this.server.to(data.conversationId).emit('new_message', message);

    // ✅ Conversation list update করুন (সবার জন্য)
    const participants = await this.messagesService.getConversationParticipants(
      data.conversationId,
    );

    for (const participant of participants) {
      const socketId = this.connectedUsers.get(participant.userId);
      if (socketId) {
        // Conversations list update
        const conversations = await this.messagesService.getConversations(participant.userId);
        this.server.to(socketId).emit('conversations', conversations);

        // Unread count update
        const unreadCount = await this.messagesService.getUnreadCount(participant.userId);
        this.server.to(socketId).emit('unread_count', unreadCount);
      }
    }
  }

  // ==================================================
  // DELETE MESSAGE — real-time
  // ==================================================
  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.messagesService.deleteMessage(
      data.messageId,
      client.data.userId,
    );

    // ✅ Conversation room এ সবাই message_deleted পাবে
    this.server.to(message.conversationId).emit('message_deleted', {
      messageId: data.messageId,
    });
  }
}