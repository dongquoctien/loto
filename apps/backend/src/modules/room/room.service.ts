import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RoomEntity } from './entities/room.entity';
import { RoomPlayerEntity } from './entities/room-player.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { GAME_CONSTANTS } from '@loto/shared';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomRepository: Repository<RoomEntity>,
    @InjectRepository(RoomPlayerEntity)
    private readonly roomPlayerRepository: Repository<RoomPlayerEntity>,
  ) {}

  async createRoom(ownerId: number, dto: CreateRoomDto): Promise<RoomEntity> {
    const roomCode = this.generateRoomCode();

    // Hash password if provided
    let hashedPassword: string | null = null;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    const room = this.roomRepository.create({
      roomCode,
      name: dto.name,
      ownerId,
      password: hashedPassword,
      callMode: dto.callMode || 'auto',
      callVoice: dto.callVoice || 'default',
      autoCallInterval: dto.autoCallInterval || GAME_CONSTANTS.DEFAULT_AUTO_CALL_INTERVAL,
      pricePerSheet: dto.pricePerSheet || GAME_CONSTANTS.DEFAULT_PRICE_PER_SHEET,
      maxPlayers: dto.maxPlayers || GAME_CONSTANTS.DEFAULT_MAX_PLAYERS,
      winHorizontal: dto.winHorizontal ?? true,
      winVertical: dto.winVertical ?? false,
      winDiagonal: dto.winDiagonal ?? false,
      allowHandsFree: dto.allowHandsFree ?? false,
      backgroundMusicUrl: dto.backgroundMusicUrl || null,
    });

    const savedRoom = await this.roomRepository.save(room);

    // Add owner as a player
    await this.roomPlayerRepository.save({
      roomId: savedRoom.id,
      userId: ownerId,
      isOnline: true,
    });

    return savedRoom;
  }

  async findByCode(roomCode: string): Promise<RoomEntity> {
    const room = await this.roomRepository.findOne({
      where: { roomCode },
      relations: ['owner', 'players', 'players.user'],
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async findById(roomId: number): Promise<RoomEntity> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['owner', 'players', 'players.user'],
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async listActiveRooms(): Promise<RoomEntity[]> {
    return this.roomRepository.find({
      where: { status: 'waiting' },
      relations: ['owner', 'players'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateRoom(roomId: number, userId: number, dto: UpdateRoomDto): Promise<RoomEntity> {
    const room = await this.findById(roomId);
    if (room.ownerId !== userId) {
      throw new ForbiddenException('Only room owner can update settings');
    }

    Object.assign(room, dto);
    return this.roomRepository.save(room);
  }

  async joinRoom(
    roomCode: string,
    userId: number,
    password?: string,
  ): Promise<RoomEntity> {
    const room = await this.findByCode(roomCode);

    // Check if room is closed
    if (room.status === 'closed') {
      throw new ForbiddenException('Phòng đã đóng');
    }

    const existing = await this.roomPlayerRepository.findOne({
      where: { roomId: room.id, userId },
    });

    // If not already a member, validate password (if room has one)
    if (!existing) {
      // Check password for new joiners (owner doesn't need password)
      if (room.password && room.ownerId !== userId) {
        if (!password) {
          throw new UnauthorizedException('Password required');
        }
        const isValid = await bcrypt.compare(password, room.password);
        if (!isValid) {
          throw new UnauthorizedException('Invalid password');
        }
      }

      const playerCount = await this.roomPlayerRepository.count({
        where: { roomId: room.id },
      });

      if (playerCount >= room.maxPlayers) {
        throw new ForbiddenException('Room is full');
      }

      await this.roomPlayerRepository.save({
        roomId: room.id,
        userId,
        isOnline: true,
      });
    } else {
      existing.isOnline = true;
      await this.roomPlayerRepository.save(existing);
    }

    return this.findById(room.id);
  }

  async hasPassword(roomCode: string): Promise<boolean> {
    const room = await this.roomRepository.findOne({
      where: { roomCode },
      select: ['password'],
    });
    return !!room?.password;
  }

  async leaveRoom(roomId: number, userId: number): Promise<void> {
    await this.roomPlayerRepository.delete({ roomId, userId });
  }

  /**
   * Close a room (set status to closed) and remove all players.
   * This preserves historical game data for statistics.
   */
  async closeRoom(roomId: number): Promise<void> {
    // Remove all players from the room
    await this.roomPlayerRepository.delete({ roomId });

    // Set room status to closed (preserves history)
    await this.roomRepository.update({ id: roomId }, { status: 'closed' });
  }

  /**
   * @deprecated Use closeRoom() to preserve historical data for statistics.
   * Only use deleteRoom() when you actually want to permanently delete all data.
   */
  async deleteRoom(roomId: number): Promise<void> {
    // Delete all players first, then the room (cascade will delete game history!)
    await this.roomPlayerRepository.delete({ roomId });
    await this.roomRepository.delete({ id: roomId });
  }

  async isOwner(roomId: number, userId: number): Promise<boolean> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    return room ? room.ownerId === userId : false;
  }

  async setPlayerReady(roomId: number, userId: number, isReady: boolean): Promise<void> {
    await this.roomPlayerRepository.update({ roomId, userId }, { isReady });
  }

  async resetAllPlayersReady(roomId: number): Promise<void> {
    await this.roomPlayerRepository.update({ roomId }, { isReady: false });
  }

  async setPlayerOffline(roomId: number, userId: number): Promise<void> {
    await this.roomPlayerRepository.update({ roomId, userId }, { isOnline: false, isReady: false });
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < GAME_CONSTANTS.ROOM_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
