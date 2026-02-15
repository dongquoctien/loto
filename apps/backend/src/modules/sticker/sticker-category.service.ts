import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StickerCategoryEntity } from './sticker-category.entity';
import { StickerEntity } from './sticker.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class StickerCategoryService {
  constructor(
    @InjectRepository(StickerCategoryEntity)
    private readonly categoryRepository: Repository<StickerCategoryEntity>,
    @InjectRepository(StickerEntity)
    private readonly stickerRepository: Repository<StickerEntity>,
  ) {}

  /**
   * Get all active categories with their stickers (for regular users)
   */
  async getActiveCategories(): Promise<StickerCategoryEntity[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
      relations: ['stickers'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  /**
   * Get all categories (for admin)
   */
  async getAllCategories(): Promise<StickerCategoryEntity[]> {
    return this.categoryRepository.find({
      relations: ['stickers'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  /**
   * Get category by ID
   */
  async getById(id: number): Promise<StickerCategoryEntity> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['stickers'],
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  /**
   * Get category by slug
   */
  async getBySlug(slug: string): Promise<StickerCategoryEntity | null> {
    return this.categoryRepository.findOne({ where: { slug } });
  }

  /**
   * Create a new category (admin only)
   */
  async create(dto: CreateCategoryDto): Promise<StickerCategoryEntity> {
    // Check if slug already exists
    const existing = await this.getBySlug(dto.slug);
    if (existing) {
      throw new ConflictException('Category slug already exists');
    }

    const category = this.categoryRepository.create({
      ...dto,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.categoryRepository.save(category);
  }

  /**
   * Update a category (admin only)
   */
  async update(id: number, dto: UpdateCategoryDto): Promise<StickerCategoryEntity> {
    const category = await this.getById(id);

    // Check if new slug conflicts with existing one
    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.getBySlug(dto.slug);
      if (existing) {
        throw new ConflictException('Category slug already exists');
      }
    }

    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  /**
   * Toggle category active status (admin only)
   */
  async toggleActive(id: number): Promise<StickerCategoryEntity> {
    const category = await this.getById(id);
    category.isActive = !category.isActive;
    return this.categoryRepository.save(category);
  }

  /**
   * Delete a category (admin only)
   */
  async delete(id: number): Promise<void> {
    const category = await this.getById(id);

    // Check if category has stickers
    const stickerCount = await this.stickerRepository.count({
      where: { categoryId: id },
    });

    if (stickerCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${stickerCount} sticker(s). Move or delete the stickers first.`,
      );
    }

    await this.categoryRepository.remove(category);
  }
}
