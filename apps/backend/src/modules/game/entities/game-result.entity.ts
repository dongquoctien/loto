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
import { TicketEntity } from '../../ticket/entities/ticket.entity';

@Entity('game_results')
export class GameResultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id' })
  sessionId: number;

  @Column({ name: 'winner_id' })
  winnerId: number;

  @Column({
    name: 'win_type',
    type: 'enum',
    enum: ['horizontal', 'vertical', 'diagonal'],
  })
  winType: 'horizontal' | 'vertical' | 'diagonal';

  @Column({ name: 'winning_ticket_id' })
  winningTicketId: number;

  @Column({ name: 'line_details', type: 'json', nullable: true })
  lineDetails: Record<string, unknown>;

  @ManyToOne(() => GameSessionEntity, (gs) => gs.gameResults, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  gameSession: GameSessionEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'winner_id' })
  winner: UserEntity;

  @ManyToOne(() => TicketEntity)
  @JoinColumn({ name: 'winning_ticket_id' })
  winningTicket: TicketEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
