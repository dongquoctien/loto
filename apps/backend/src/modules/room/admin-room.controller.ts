import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminRoomService } from './admin-room.service';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';
import {
  AdminRoomFilterDto,
  AdminUpdateRoomDto,
  CloseRoomDto,
  RemovePlayerDto,
} from './dto/admin-room.dto';

@Controller('admin/rooms')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminRoomController {
  constructor(private readonly adminRoomService: AdminRoomService) {}

  /**
   * GET /api/admin/rooms - Get all rooms with filters
   */
  @Get()
  async getAllRooms(@Query() filter: AdminRoomFilterDto) {
    return this.adminRoomService.getAllRooms(filter);
  }

  /**
   * GET /api/admin/rooms/stats - Get room statistics
   */
  @Get('stats')
  async getRoomStats() {
    return this.adminRoomService.getRoomStats();
  }

  /**
   * GET /api/admin/rooms/:id - Get room by ID
   */
  @Get(':id')
  async getRoomById(@Param('id', ParseIntPipe) id: number) {
    const room = await this.adminRoomService.getRoomById(id);
    return this.adminRoomService.sanitizeForAdmin(room);
  }

  /**
   * GET /api/admin/rooms/:id/players - Get room players
   */
  @Get(':id/players')
  async getRoomPlayers(@Param('id', ParseIntPipe) id: number) {
    const players = await this.adminRoomService.getRoomPlayers(id);
    return players.map((p) => ({
      id: p.id,
      odl: p.id,
      userId: p.userId,
      username: p.user?.username,
      displayName: p.user?.displayName || p.user?.username,
      avatarUrl: p.user?.avatarUrl,
      isOnline: p.isOnline,
      isReady: p.isReady,
      joinedAt: p.joinedAt,
    }));
  }

  /**
   * PUT /api/admin/rooms/:id - Update room settings
   */
  @Put(':id')
  async updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateRoomDto,
  ) {
    const room = await this.adminRoomService.updateRoom(id, dto);
    return this.adminRoomService.sanitizeForAdmin(room);
  }

  /**
   * POST /api/admin/rooms/:id/close - Close a room
   */
  @Post(':id/close')
  async closeRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseRoomDto,
  ) {
    const room = await this.adminRoomService.closeRoom(id, dto.reason);
    return this.adminRoomService.sanitizeForAdmin(room);
  }

  /**
   * DELETE /api/admin/rooms/:id - Delete a room
   */
  @Delete(':id')
  async deleteRoom(@Param('id', ParseIntPipe) id: number) {
    await this.adminRoomService.deleteRoom(id);
    return { success: true };
  }

  /**
   * DELETE /api/admin/rooms/:id/players/:userId - Remove player from room
   */
  @Delete(':id/players/:userId')
  async removePlayer(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: RemovePlayerDto,
  ) {
    await this.adminRoomService.removePlayer(id, userId, dto.reason);
    return { success: true };
  }
}
