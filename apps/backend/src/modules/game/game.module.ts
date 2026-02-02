import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameSessionEntity } from './entities/game-session.entity';
import { CalledNumberEntity } from './entities/called-number.entity';
import { PurchasedSheetEntity } from './entities/purchased-sheet.entity';
import { MarkedCellEntity } from './entities/marked-cell.entity';
import { GameResultEntity } from './entities/game-result.entity';
import { PenaltyEntity } from './entities/penalty.entity';
import { KinhClaimEntity } from './entities/kinh-claim.entity';
import { GameService } from './game.service';
import { TicketModule } from '../ticket/ticket.module';
import { RoomModule } from '../room/room.module';

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
    RoomModule,
  ],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
