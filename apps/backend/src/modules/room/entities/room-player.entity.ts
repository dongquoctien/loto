import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { RoomEntity } from './room.entity';
import { UserEntity } from '../../user/user.entity';

@Entity('room_players')
@Unique(['roomId', 'userId'])
export class RoomPlayerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'room_id' })
  roomId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'is_online', type: 'boolean', default: true })
  isOnline: boolean;

  @Column({ name: 'is_ready', type: 'boolean', default: false })
  isReady: boolean;

  @ManyToOne(() => RoomEntity, (room) => room.players, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: RoomEntity;

  @ManyToOne(() => UserEntity, (user) => user.roomPlayers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
