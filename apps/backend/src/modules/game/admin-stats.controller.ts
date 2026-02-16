import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminStatsService, StatsFilter } from './admin-stats.service';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminStatsController {
  constructor(private readonly statsService: AdminStatsService) {}

  /**
   * GET /api/admin/stats/overall
   * Get overall statistics for a year
   */
  @Get('overall')
  async getOverallStats(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.statsService.getOverallStats(yearNum);
  }

  /**
   * GET /api/admin/stats/players
   * Get statistics by player
   */
  @Get('players')
  async getPlayerStats(
    @Query('year') year?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filter: StatsFilter = {
      year: year ? parseInt(year, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };
    return this.statsService.getStatsByPlayer(filter);
  }

  /**
   * GET /api/admin/stats/rooms
   * Get statistics by room
   */
  @Get('rooms')
  async getRoomStats(
    @Query('year') year?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filter: StatsFilter = {
      year: year ? parseInt(year, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };
    return this.statsService.getStatsByRoom(filter);
  }

  /**
   * GET /api/admin/stats/years
   * Get available years for filtering
   */
  @Get('years')
  async getAvailableYears() {
    return this.statsService.getAvailableYears();
  }

  /**
   * GET /api/admin/stats/top-players
   * Get top players by net profit
   */
  @Get('top-players')
  async getTopPlayers(
    @Query('limit') limit?: string,
    @Query('year') year?: string,
  ) {
    return this.statsService.getTopPlayers(
      limit ? parseInt(limit, 10) : 10,
      year ? parseInt(year, 10) : undefined,
    );
  }

  /**
   * GET /api/admin/stats/top-rooms
   * Get top rooms by revenue
   */
  @Get('top-rooms')
  async getTopRooms(
    @Query('limit') limit?: string,
    @Query('year') year?: string,
  ) {
    return this.statsService.getTopRooms(
      limit ? parseInt(limit, 10) : 10,
      year ? parseInt(year, 10) : undefined,
    );
  }
}
