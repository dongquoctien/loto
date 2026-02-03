import { Controller, Get, Post, Put, Param, Body, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { RoomService } from './room.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../user/user.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { GameGateway } from '../gateway/game.gateway';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    @Inject(forwardRef(() => GameGateway))
    private readonly gameGateway: GameGateway,
  ) {}

  @Post()
  async createRoom(
    @CurrentUser() user: UserEntity,
    @Body() dto: CreateRoomDto,
  ) {
    const room = await this.roomService.createRoom(user.id, dto);
    // Notify all clients (lobby) that a new room was created
    this.gameGateway.broadcastRoomCreated(room);
    return room;
  }

  @Get()
  async listRooms() {
    return this.roomService.listActiveRooms();
  }

  @Get(':code')
  async getRoomByCode(@Param('code') code: string) {
    return this.roomService.findByCode(code);
  }

  @Put(':id')
  async updateRoom(
    @Param('id') id: number,
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomService.updateRoom(id, user.id, dto);
  }

  @Post(':code/join')
  async joinRoom(
    @Param('code') code: string,
    @CurrentUser() user: UserEntity,
    @Body() dto: JoinRoomDto,
  ) {
    return this.roomService.joinRoom(code, user.id, dto.password);
  }

  @Get(':code/has-password')
  async checkRoomPassword(@Param('code') code: string) {
    const hasPassword = await this.roomService.hasPassword(code);
    return { hasPassword };
  }
}
