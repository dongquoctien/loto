import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { PaymentReportData } from '@loto/shared';

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

  async savePaymentReportMessage(
    roomId: number,
    senderId: number,
    paymentData: PaymentReportData,
  ): Promise<ChatMessageEntity> {
    const message = this.chatMessageRepository.create({
      roomId,
      senderId,
      content: '📋 Kết quả Lô Tô',
      type: 'payment_report',
      paymentData,
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

  async findMessageById(id: number): Promise<ChatMessageEntity | null> {
    return this.chatMessageRepository.findOne({
      where: { id },
      relations: ['sender'],
    });
  }

  async updatePaymentStatus(
    messageId: number,
    payerUserId: number,
    paid: boolean,
  ): Promise<ChatMessageEntity | null> {
    const message = await this.findMessageById(messageId);
    if (!message || message.type !== 'payment_report' || !message.paymentData) {
      return null;
    }

    // Update the paid status for the specific payer
    const payer = message.paymentData.payers.find(p => p.userId === payerUserId);
    if (payer) {
      payer.paid = paid;
      await this.chatMessageRepository.save(message);
    }

    return message;
  }

  async deleteMessagesByRoomId(roomId: number): Promise<void> {
    await this.chatMessageRepository.delete({ roomId });
  }
}
