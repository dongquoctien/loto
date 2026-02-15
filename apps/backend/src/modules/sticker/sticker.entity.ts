import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StickerCategoryEntity } from './sticker-category.entity';

@Entity('stickers')
export class StickerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sticker_id', length: 50, unique: true })
  stickerId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 500 })
  url: string;

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => StickerCategoryEntity, (category) => category.stickers)
  @JoinColumn({ name: 'category_id' })
  category: StickerCategoryEntity;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
