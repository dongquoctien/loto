import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { GameSessionEntity } from './game-session.entity';
import { UserEntity } from '../../user/user.entity';

@Entity('penalties')
export class PenaltyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id' })
  sessionId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 255, default: 'wrong_kinh' })
  reason: string;

  @Column({ name: 'must_pay', type: 'boolean', default: true })
  mustPay: boolean;

  @ManyToOne(() => GameSessionEntity, (gs) => gs.penalties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  gameSession: GameSessionEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
