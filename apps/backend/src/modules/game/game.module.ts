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
import { TicketModule } from '../ticket/ticket.module';
import { RoomModule } from '../room/room.module';
import { UserModule } from '../user/user.module';

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
    ]),
    TicketModule,
    forwardRef(() => RoomModule),
    UserModule,
  ],
  controllers: [ReportController],
  providers: [GameService, ReportService],
  exports: [GameService, ReportService],
})
export class GameModule {}
