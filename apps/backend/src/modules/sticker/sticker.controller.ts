import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { StickerService } from './sticker.service';
import { StickerCategoryService } from './sticker-category.service';
import { CreateStickerDto, UpdateStickerDto, CreateCategoryDto, UpdateCategoryDto } from './dto';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';

@Controller()
export class StickerController {
  constructor(
    private readonly stickerService: StickerService,
    private readonly categoryService: StickerCategoryService,
  ) {}

  // ============ PUBLIC ENDPOINTS ============

  /**
   * GET /api/stickers - Get all active stickers (for regular users)
   */
  @Get('stickers')
  async getActiveStickers() {
    return this.stickerService.getActiveStickers();
  }

  /**
   * GET /api/stickers/:stickerId - Get sticker by stickerId
   */
  @Get('stickers/:stickerId')
  async getStickerByStickerId(@Param('stickerId') stickerId: string) {
    return this.stickerService.getByStickerId(stickerId);
  }

  // ============ ADMIN ENDPOINTS ============

  /**
   * GET /api/admin/stickers - Get all stickers (for admin)
   */
  @Get('admin/stickers')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllStickers() {
    return this.stickerService.getAllStickers();
  }

  /**
   * GET /api/admin/stickers/:id - Get sticker by ID
   */
  @Get('admin/stickers/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getStickerById(@Param('id', ParseIntPipe) id: number) {
    return this.stickerService.getById(id);
  }

  /**
   * POST /api/admin/stickers - Create a new sticker
   */
  @Post('admin/stickers')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createSticker(@Body() dto: CreateStickerDto) {
    return this.stickerService.create(dto);
  }

  /**
   * PUT /api/admin/stickers/:id - Update a sticker
   */
  @Put('admin/stickers/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateSticker(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStickerDto,
  ) {
    return this.stickerService.update(id, dto);
  }

  /**
   * PATCH /api/admin/stickers/:id/toggle - Toggle sticker active status
   */
  @Patch('admin/stickers/:id/toggle')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async toggleStickerActive(@Param('id', ParseIntPipe) id: number) {
    return this.stickerService.toggleActive(id);
  }

  /**
   * DELETE /api/admin/stickers/:id - Delete a sticker
   */
  @Delete('admin/stickers/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteSticker(@Param('id', ParseIntPipe) id: number) {
    await this.stickerService.delete(id);
    return { success: true };
  }

  // ============ CATEGORY PUBLIC ENDPOINTS ============

  /**
   * GET /api/sticker-categories - Get all active categories with stickers
   */
  @Get('sticker-categories')
  async getActiveCategories() {
    return this.categoryService.getActiveCategories();
  }

  // ============ CATEGORY ADMIN ENDPOINTS ============

  /**
   * GET /api/admin/sticker-categories - Get all categories (for admin)
   */
  @Get('admin/sticker-categories')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllCategories() {
    return this.categoryService.getAllCategories();
  }

  /**
   * GET /api/admin/sticker-categories/:id - Get category by ID
   */
  @Get('admin/sticker-categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getCategoryById(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.getById(id);
  }

  /**
   * POST /api/admin/sticker-categories - Create a new category
   */
  @Post('admin/sticker-categories')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  /**
   * PUT /api/admin/sticker-categories/:id - Update a category
   */
  @Put('admin/sticker-categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  /**
   * PATCH /api/admin/sticker-categories/:id/toggle - Toggle category active status
   */
  @Patch('admin/sticker-categories/:id/toggle')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async toggleCategoryActive(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.toggleActive(id);
  }

  /**
   * DELETE /api/admin/sticker-categories/:id - Delete a category
   */
  @Delete('admin/sticker-categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    await this.categoryService.delete(id);
    return { success: true };
  }
}
