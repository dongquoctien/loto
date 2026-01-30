import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { GameSessionEntity } from './game-session.entity';
import { UserEntity } from '../../user/user.entity';
import { TicketEntity } from '../../ticket/entities/ticket.entity';

@Entity('marked_cells')
@Unique(['sessionId', 'userId', 'ticketId', 'rowIndex', 'colIndex'])
export class MarkedCellEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id' })
  sessionId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'ticket_id' })
  ticketId: number;

  @Column({ name: 'row_index', type: 'int' })
  rowIndex: number;

  @Column({ name: 'col_index', type: 'int' })
  colIndex: number;

  @Column({ name: 'number_value', type: 'int' })
  numberValue: number;

  @ManyToOne(() => GameSessionEntity, (gs) => gs.markedCells, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  gameSession: GameSessionEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => TicketEntity)
  @JoinColumn({ name: 'ticket_id' })
  ticket: TicketEntity;

  @CreateDateColumn({ name: 'marked_at' })
  markedAt: Date;
}
