import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        storage: diskStorage({
          destination: configService.get<string>('UPLOAD_DIR', './uploads'),
          filename: (_req, file, cb) => {
            const ext = extname(file.originalname);
            const filename = `${uuidv4()}${ext}`;
            cb(null, filename);
          },
        }),
        limits: {
          fileSize: configService.get<number>('MAX_FILE_SIZE', 5 * 1024 * 1024),
        },
        fileFilter: (_req, file, cb) => {
          const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
          if (allowed.test(extname(file.originalname))) {
            cb(null, true);
          } else {
            cb(new Error('Only image files are allowed'), false);
          }
        },
      }),
    }),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
