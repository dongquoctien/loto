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
import { UserEntity } from '../../user/user.entity';
import { RoomPlayerEntity } from './room-player.entity';
import { GameSessionEntity } from '../../game/entities/game-session.entity';

@Entity('rooms')
export class RoomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'room_code', unique: true, length: 10 })
  roomCode: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'owner_id' })
  ownerId: number;

  @ManyToOne(() => UserEntity, (user) => user.ownedRooms)
  @JoinColumn({ name: 'owner_id' })
  owner: UserEntity;

  @Column({
    name: 'call_mode',
    type: 'enum',
    enum: ['auto', 'manual'],
    default: 'auto',
  })
  callMode: 'auto' | 'manual';

  @Column({
    name: 'auto_call_interval',
    type: 'int',
    default: 5,
  })
  autoCallInterval: number;

  @Column({
    name: 'price_per_sheet',
    type: 'int',
    default: 10000,
  })
  pricePerSheet: number;

  @Column({
    name: 'max_players',
    type: 'int',
    default: 20,
  })
  maxPlayers: number;

  @Column({
    name: 'win_horizontal',
    type: 'boolean',
    default: true,
  })
  winHorizontal: boolean;

  @Column({
    name: 'win_vertical',
    type: 'boolean',
    default: false,
  })
  winVertical: boolean;

  @Column({
    name: 'win_diagonal',
    type: 'boolean',
    default: false,
  })
  winDiagonal: boolean;

  @Column({
    type: 'enum',
    enum: ['waiting', 'playing', 'closed'],
    default: 'waiting',
  })
  status: 'waiting' | 'playing' | 'closed';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => RoomPlayerEntity, (rp) => rp.room)
  players: RoomPlayerEntity[];

  @OneToMany(() => GameSessionEntity, (gs) => gs.room)
  gameSessions: GameSessionEntity[];
}
