import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RoomEntity } from './room.entity';
import { UserEntity } from '../../user/user.entity';
import { PaymentReportData } from '@loto/shared';

@Entity('chat_messages')
@Index(['roomId', 'createdAt'])
export class ChatMessageEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'room_id' })
  roomId: number;

  @ManyToOne(() => RoomEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: RoomEntity;

  @Column({ name: 'sender_id' })
  senderId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: UserEntity;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: ['text', 'system', 'payment_report', 'sticker'],
    default: 'text',
  })
  type: 'text' | 'system' | 'payment_report' | 'sticker';

  @Column({ name: 'payment_data', type: 'json', nullable: true })
  paymentData: PaymentReportData | null;

  @Column({ name: 'sticker_id', type: 'varchar', length: 50, nullable: true })
  stickerId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
