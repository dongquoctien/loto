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

@Entity('called_numbers')
@Unique(['sessionId', 'numberValue'])
export class CalledNumberEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id' })
  sessionId: number;

  @Column({ name: 'number_value', type: 'int' })
  numberValue: number;

  @Column({ name: 'call_order', type: 'int' })
  callOrder: number;

  @ManyToOne(() => GameSessionEntity, (gs) => gs.calledNumbers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  gameSession: GameSessionEntity;

  @CreateDateColumn({ name: 'called_at' })
  calledAt: Date;
}
