import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GameGateway } from './game.gateway';
import { GameModule } from '../game/game.module';
import { RoomModule } from '../room/room.module';
import { TicketModule } from '../ticket/ticket.module';
import { UserModule } from '../user/user.module';
import { StickerModule } from '../sticker/sticker.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default-secret-change-me'),
      }),
    }),
    GameModule,
    forwardRef(() => RoomModule),
    TicketModule,
    UserModule,
    StickerModule,
  ],
  providers: [GameGateway],
  exports: [GameGateway],
})
export class GatewayModule {}
