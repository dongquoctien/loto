import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { RoomEntity } from '../../room/entities/room.entity';
import { CalledNumberEntity } from './called-number.entity';
import { PurchasedSheetEntity } from './purchased-sheet.entity';
import { MarkedCellEntity } from './marked-cell.entity';
import { GameResultEntity } from './game-result.entity';
import { PenaltyEntity } from './penalty.entity';
import { KinhClaimEntity } from './kinh-claim.entity';

@Entity('game_sessions')
export class GameSessionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'room_id' })
  roomId: number;

  @Column({ name: 'session_number', type: 'int', default: 1 })
  sessionNumber: number;

  @Column({
    type: 'enum',
    enum: ['preparing', 'active', 'paused', 'paused_for_kinh', 'finished'],
    default: 'preparing',
  })
  status: 'preparing' | 'active' | 'paused' | 'paused_for_kinh' | 'finished';

  @ManyToOne(() => RoomEntity, (room) => room.gameSessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: RoomEntity;

  @OneToMany(() => CalledNumberEntity, (cn) => cn.gameSession)
  calledNumbers: CalledNumberEntity[];

  @OneToMany(() => PurchasedSheetEntity, (ps) => ps.gameSession)
  purchasedSheets: PurchasedSheetEntity[];

  @OneToMany(() => MarkedCellEntity, (mc) => mc.gameSession)
  markedCells: MarkedCellEntity[];

  @OneToMany(() => GameResultEntity, (gr) => gr.gameSession)
  gameResults: GameResultEntity[];

  @OneToMany(() => PenaltyEntity, (p) => p.gameSession)
  penalties: PenaltyEntity[];

  @OneToMany(() => KinhClaimEntity, (kc) => kc.gameSession)
  kinhClaims: KinhClaimEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
