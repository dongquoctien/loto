import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../user/user.entity';
import { RoomService } from '../room/room.service';

@Controller('rooms/:code/report')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly roomService: RoomService,
  ) {}

  @Get('personal')
  async getPersonalReport(
    @Param('code') roomCode: string,
    @CurrentUser() user: UserEntity,
  ) {
    const room = await this.roomService.findByCode(roomCode);
    return this.reportService.getPersonalReport(user.id, room.id);
  }

  @Get('room')
  async getRoomReport(@Param('code') roomCode: string) {
    const room = await this.roomService.findByCode(roomCode);
    return this.reportService.getRoomReport(room.id);
  }
}
