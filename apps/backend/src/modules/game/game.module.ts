import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameSessionEntity } from './entities/game-session.entity';
import { CalledNumberEntity } from './entities/called-number.entity';
import { PurchasedSheetEntity } from './entities/purchased-sheet.entity';
import { MarkedCellEntity } from './entities/marked-cell.entity';
import { GameResultEntity } from './entities/game-result.entity';
import { PenaltyEntity } from './entities/penalty.entity';
import { KinhClaimEntity } from './entities/kinh-claim.entity';
import { GameService } from './game.service';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminStatsController } from './admin-stats.controller';
import { TicketModule } from '../ticket/ticket.module';
import { RoomModule } from '../room/room.module';
import { UserModule } from '../user/user.module';
import { RoomEntity } from '../room/entities/room.entity';
import { UserEntity } from '../user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameSessionEntity,
      CalledNumberEntity,
      PurchasedSheetEntity,
      MarkedCellEntity,
      GameResultEntity,
      PenaltyEntity,
      KinhClaimEntity,
      RoomEntity,
      UserEntity,
    ]),
    TicketModule,
    forwardRef(() => RoomModule),
    UserModule,
  ],
  controllers: [ReportController, AdminStatsController],
  providers: [GameService, ReportService, AdminStatsService],
  exports: [GameService, ReportService, AdminStatsService],
})
export class GameModule {}
