import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SystemSettingService } from './system-setting.service';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';
import { IsString, IsOptional, IsEnum } from 'class-validator';

class UpdateSettingDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['string', 'number', 'boolean', 'json'])
  valueType?: 'string' | 'number' | 'boolean' | 'json';
}

@Controller()
export class SystemSettingController {
  constructor(private readonly settingService: SystemSettingService) {}

  /**
   * GET /api/settings/public - Get public settings (no auth)
   * Used by frontend to get sticker placeholder, etc.
   */
  @Get('settings/public')
  async getPublicSettings() {
    return this.settingService.getPublicSettings();
  }

  /**
   * GET /api/admin/settings - Get all settings (admin only)
   */
  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllSettings() {
    return this.settingService.getAll();
  }

  /**
   * GET /api/admin/settings/:key - Get a single setting
   */
  @Get('admin/settings/:key')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getSetting(@Param('key') key: string) {
    const setting = await this.settingService.getByKey(key);
    if (!setting) {
      // Return default if exists
      const value = await this.settingService.get(key);
      return { key, value, isDefault: true };
    }
    return setting;
  }

  /**
   * PUT /api/admin/settings/:key - Create or update a setting
   */
  @Put('admin/settings/:key')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    return this.settingService.set(
      key,
      dto.value,
      dto.description,
      dto.valueType,
    );
  }

  /**
   * DELETE /api/admin/settings/:key - Delete a setting (revert to default)
   */
  @Delete('admin/settings/:key')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteSetting(@Param('key') key: string) {
    await this.settingService.delete(key);
    return { success: true };
  }
}
