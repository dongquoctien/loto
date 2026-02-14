import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomEntity } from './entities/room.entity';
import { RoomPlayerEntity } from './entities/room-player.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { RoomService } from './room.service';
import { ChatService } from './chat.service';
import { RoomController } from './room.controller';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomEntity, RoomPlayerEntity, ChatMessageEntity]),
    forwardRef(() => GatewayModule),
  ],
  controllers: [RoomController],
  providers: [RoomService, ChatService],
  exports: [RoomService, ChatService, TypeOrmModule],
})
export class RoomModule {}
