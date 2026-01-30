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
import { SheetEntity } from '../../ticket/entities/sheet.entity';

@Entity('purchased_sheets')
@Unique(['sessionId', 'sheetId'])
export class PurchasedSheetEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id' })
  sessionId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'sheet_id' })
  sheetId: number;

  @ManyToOne(() => GameSessionEntity, (gs) => gs.purchasedSheets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  gameSession: GameSessionEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => SheetEntity)
  @JoinColumn({ name: 'sheet_id' })
  sheet: SheetEntity;

  @CreateDateColumn({ name: 'purchased_at' })
  purchasedAt: Date;
}
