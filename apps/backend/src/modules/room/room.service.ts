import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    const room = this.roomRepository.create({
      roomCode,
      name: dto.name,
      ownerId,
      callMode: dto.callMode || 'auto',
      callVoice: dto.callVoice || 'default',
      autoCallInterval: dto.autoCallInterval || GAME_CONSTANTS.DEFAULT_AUTO_CALL_INTERVAL,
      pricePerSheet: dto.pricePerSheet || GAME_CONSTANTS.DEFAULT_PRICE_PER_SHEET,
      maxPlayers: dto.maxPlayers || GAME_CONSTANTS.DEFAULT_MAX_PLAYERS,
      winHorizontal: dto.winHorizontal ?? true,
      winVertical: dto.winVertical ?? false,
      winDiagonal: dto.winDiagonal ?? false,
      allowHandsFree: dto.allowHandsFree ?? false,
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

  async joinRoom(roomCode: string, userId: number): Promise<RoomEntity> {
    const room = await this.findByCode(roomCode);

    const existing = await this.roomPlayerRepository.findOne({
      where: { roomId: room.id, userId },
    });

    if (!existing) {
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

  async leaveRoom(roomId: number, userId: number): Promise<void> {
    await this.roomPlayerRepository.delete({ roomId, userId });
  }

  async deleteRoom(roomId: number): Promise<void> {
    // Delete all players first, then the room (cascade should handle it, but be explicit)
    await this.roomPlayerRepository.delete({ roomId });
    await this.roomRepository.delete({ id: roomId });
  }

  async isOwner(roomId: number, userId: number): Promise<boolean> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    return room ? room.ownerId === userId : false;
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
