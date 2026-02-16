import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { UploadModule } from './modules/upload/upload.module';
import { RoomModule } from './modules/room/room.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { GameModule } from './modules/game/game.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { StickerModule } from './modules/sticker/sticker.module';
import { SystemSettingModule } from './modules/setting/system-setting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'loto_user'),
        password: configService.get<string>('DB_PASSWORD', 'loto_password'),
        database: configService.get<string>('DB_DATABASE', 'loto_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    UserModule,
    UploadModule,
    RoomModule,
    TicketModule,
    GameModule,
    GatewayModule,
    StickerModule,
    SystemSettingModule,
  ],
})
export class AppModule {}
