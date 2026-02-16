import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { RoomEntity } from './entities/room.entity';
import { RoomPlayerEntity } from './entities/room-player.entity';
import {
  AdminRoomFilterDto,
  AdminUpdateRoomDto,
  AdminRoomResponse,
  AdminRoomsListResponse,
} from './dto/admin-room.dto';

@Injectable()
export class AdminRoomService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomRepository: Repository<RoomEntity>,
    @InjectRepository(RoomPlayerEntity)
    private readonly roomPlayerRepository: Repository<RoomPlayerEntity>,
  ) {}

  /**
   * Get all rooms with filtering and pagination (admin view)
   */
  async getAllRooms(filter: AdminRoomFilterDto): Promise<AdminRoomsListResponse> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<RoomEntity> = {};

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.ownerId) {
      where.ownerId = filter.ownerId;
    }

    const queryBuilder = this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.owner', 'owner')
      .leftJoin('room.players', 'players')
      .addSelect('COUNT(players.id)', 'playerCount')
      .groupBy('room.id')
      .addGroupBy('owner.id');

    // Apply filters
    if (filter.status) {
      queryBuilder.andWhere('room.status = :status', { status: filter.status });
    }

    if (filter.ownerId) {
      queryBuilder.andWhere('room.ownerId = :ownerId', { ownerId: filter.ownerId });
    }

    if (filter.search) {
      queryBuilder.andWhere(
        '(room.name LIKE :search OR room.roomCode LIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    // Get total count
    const totalQuery = this.roomRepository.createQueryBuilder('room');
    if (filter.status) {
      totalQuery.andWhere('room.status = :status', { status: filter.status });
    }
    if (filter.ownerId) {
      totalQuery.andWhere('room.ownerId = :ownerId', { ownerId: filter.ownerId });
    }
    if (filter.search) {
      totalQuery.andWhere(
        '(room.name LIKE :search OR room.roomCode LIKE :search)',
        { search: `%${filter.search}%` },
      );
    }
    const total = await totalQuery.getCount();

    // Get rooms with pagination
    queryBuilder
      .orderBy('room.createdAt', 'DESC')
      .offset(skip)
      .limit(limit);

    const rawResults = await queryBuilder.getRawAndEntities();
    const rooms = rawResults.entities;
    const rawRows = rawResults.raw;

    // Map to response format
    const roomResponses: AdminRoomResponse[] = rooms.map((room, index) => ({
      id: room.id,
      roomCode: room.roomCode,
      name: room.name,
      ownerId: room.ownerId,
      ownerName: room.owner?.displayName || room.owner?.username || 'Unknown',
      status: room.status,
      playerCount: parseInt(rawRows[index]?.playerCount || '0', 10),
      maxPlayers: room.maxPlayers,
      hasPassword: !!room.password,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }));

    return {
      rooms: roomResponses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get room details by ID (admin view - includes all info)
   */
  async getRoomById(roomId: number): Promise<RoomEntity> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['owner', 'players', 'players.user', 'gameSessions'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  /**
   * Update room settings as admin (no ownership check)
   */
  async updateRoom(roomId: number, dto: AdminUpdateRoomDto): Promise<RoomEntity> {
    const room = await this.getRoomById(roomId);

    // Apply updates
    Object.assign(room, dto);

    return this.roomRepository.save(room);
  }

  /**
   * Close a room (set status to 'closed')
   */
  async closeRoom(roomId: number, reason?: string): Promise<RoomEntity> {
    const room = await this.getRoomById(roomId);

    if (room.status === 'closed') {
      throw new BadRequestException('Room is already closed');
    }

    room.status = 'closed';
    return this.roomRepository.save(room);
  }

  /**
   * Delete a room permanently
   */
  async deleteRoom(roomId: number): Promise<void> {
    const room = await this.getRoomById(roomId);

    // Delete all players first
    await this.roomPlayerRepository.delete({ roomId });

    // Delete the room
    await this.roomRepository.delete({ id: roomId });
  }

  /**
   * Remove a player from room
   */
  async removePlayer(roomId: number, userId: number, reason?: string): Promise<void> {
    const room = await this.getRoomById(roomId);

    // Check if player exists in room
    const player = await this.roomPlayerRepository.findOne({
      where: { roomId, userId },
    });

    if (!player) {
      throw new NotFoundException('Player not found in this room');
    }

    // Cannot remove owner
    if (room.ownerId === userId) {
      throw new BadRequestException('Cannot remove room owner');
    }

    await this.roomPlayerRepository.delete({ roomId, userId });
  }

  /**
   * Get room players
   */
  async getRoomPlayers(roomId: number): Promise<RoomPlayerEntity[]> {
    await this.getRoomById(roomId); // Verify room exists

    return this.roomPlayerRepository.find({
      where: { roomId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  /**
   * Get room statistics (for admin dashboard)
   */
  async getRoomStats(): Promise<{
    total: number;
    waiting: number;
    playing: number;
    closed: number;
  }> {
    const [total, waiting, playing, closed] = await Promise.all([
      this.roomRepository.count(),
      this.roomRepository.count({ where: { status: 'waiting' } }),
      this.roomRepository.count({ where: { status: 'playing' } }),
      this.roomRepository.count({ where: { status: 'closed' } }),
    ]);

    return { total, waiting, playing, closed };
  }

  /**
   * Sanitize room for admin response (hide password hash)
   */
  sanitizeForAdmin(room: RoomEntity): Omit<RoomEntity, 'password'> & { hasPassword: boolean } {
    const { password, ...rest } = room;
    return {
      ...rest,
      hasPassword: !!password,
    };
  }
}
