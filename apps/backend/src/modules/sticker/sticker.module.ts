import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StickerEntity } from './sticker.entity';
import { StickerCategoryEntity } from './sticker-category.entity';
import { StickerService } from './sticker.service';
import { StickerCategoryService } from './sticker-category.service';
import { StickerController } from './sticker.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StickerEntity, StickerCategoryEntity])],
  controllers: [StickerController],
  providers: [StickerService, StickerCategoryService],
  exports: [StickerService, StickerCategoryService],
})
export class StickerModule {}
