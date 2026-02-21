import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StickerEntity } from './sticker.entity';
import { CreateStickerDto, UpdateStickerDto } from './dto';

@Injectable()
export class StickerService {
  constructor(
    @InjectRepository(StickerEntity)
    private readonly stickerRepository: Repository<StickerEntity>,
  ) {}

  /**
   * Get all active stickers (for regular users)
   */
  async getActiveStickers(): Promise<StickerEntity[]> {
    return this.stickerRepository.find({
      where: { isActive: true },
      relations: ['category'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  /**
   * Get all stickers (for admin)
   */
  async getAllStickers(): Promise<StickerEntity[]> {
    return this.stickerRepository.find({
      relations: ['category'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  /**
   * Get sticker by ID
   */
  async getById(id: number): Promise<StickerEntity> {
    const sticker = await this.stickerRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!sticker) {
      throw new NotFoundException('Sticker not found');
    }
    return sticker;
  }

  /**
   * Get sticker by stickerId
   */
  async getByStickerId(stickerId: string): Promise<StickerEntity | null> {
    return this.stickerRepository.findOne({ where: { stickerId } });
  }

  /**
   * Create a new sticker (admin only)
   */
  async create(dto: CreateStickerDto): Promise<StickerEntity> {
    // Check if stickerId already exists
    const existing = await this.getByStickerId(dto.stickerId);
    if (existing) {
      throw new ConflictException('Sticker ID already exists');
    }

    const sticker = this.stickerRepository.create({
      ...dto,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.stickerRepository.save(sticker);
  }

  /**
   * Update a sticker (admin only)
   */
  async update(id: number, dto: UpdateStickerDto): Promise<StickerEntity> {
    const sticker = await this.getById(id);

    // Check if new stickerId conflicts with existing one
    if (dto.stickerId && dto.stickerId !== sticker.stickerId) {
      const existing = await this.getByStickerId(dto.stickerId);
      if (existing) {
        throw new ConflictException('Sticker ID already exists');
      }
    }

    // If categoryId is being updated, clear the category relation
    // to ensure TypeORM uses the new categoryId value
    if (dto.categoryId !== undefined) {
      sticker.category = null as any;
    }

    Object.assign(sticker, dto);
    const saved = await this.stickerRepository.save(sticker);

    // Reload with relations to return complete data
    return this.getById(saved.id);
  }

  /**
   * Toggle sticker active status (admin only)
   */
  async toggleActive(id: number): Promise<StickerEntity> {
    const sticker = await this.getById(id);
    sticker.isActive = !sticker.isActive;
    return this.stickerRepository.save(sticker);
  }

  /**
   * Delete a sticker (admin only)
   */
  async delete(id: number): Promise<void> {
    const sticker = await this.getById(id);
    await this.stickerRepository.remove(sticker);
  }

  /**
   * Get stickers by category ID
   */
  async getByCategoryId(categoryId: number): Promise<StickerEntity[]> {
    return this.stickerRepository.find({
      where: { categoryId, isActive: true },
      relations: ['category'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  /**
   * Get stickers by category slug
   */
  async getByCategorySlug(slug: string): Promise<StickerEntity[]> {
    return this.stickerRepository.find({
      where: {
        category: { slug },
        isActive: true,
      },
      relations: ['category'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }
}
