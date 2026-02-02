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

@Entity('kinh_claims')
export class KinhClaimEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id' })
  sessionId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'ticket_id' })
  ticketId: number;

  @Column({ name: 'win_type', length: 20 })
  winType: string;

  @Column({ name: 'line_details', type: 'json', nullable: true })
  lineDetails: Record<string, unknown> | null;

  @Column({ name: 'pre_validated', type: 'boolean', default: false })
  preValidated: boolean;

  @Column({ name: 'claim_order', type: 'int' })
  claimOrder: number;

  @ManyToOne(() => GameSessionEntity, (gs) => gs.kinhClaims, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  gameSession: GameSessionEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
