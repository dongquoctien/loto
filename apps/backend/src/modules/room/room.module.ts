import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomEntity } from './entities/room.entity';
import { RoomPlayerEntity } from './entities/room-player.entity';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomEntity, RoomPlayerEntity]),
    forwardRef(() => GatewayModule),
  ],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
