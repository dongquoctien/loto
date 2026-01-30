import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { RoomService } from './room.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../user/user.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  async createRoom(
    @CurrentUser() user: UserEntity,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomService.createRoom(user.id, dto);
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
  ) {
    return this.roomService.joinRoom(code, user.id);
  }
}
