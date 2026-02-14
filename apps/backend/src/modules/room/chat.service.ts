import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageEntity } from './entities/chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly chatMessageRepository: Repository<ChatMessageEntity>,
  ) {}

  async saveMessage(
    roomId: number,
    senderId: number,
    content: string,
    type: 'text' | 'system' = 'text',
  ): Promise<ChatMessageEntity> {
    const message = this.chatMessageRepository.create({
      roomId,
      senderId,
      content,
      type,
    });
    return this.chatMessageRepository.save(message);
  }

  async getRecentMessages(roomId: number, limit = 50): Promise<ChatMessageEntity[]> {
    return this.chatMessageRepository.find({
      where: { roomId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async deleteMessagesByRoomId(roomId: number): Promise<void> {
    await this.chatMessageRepository.delete({ roomId });
  }
}
