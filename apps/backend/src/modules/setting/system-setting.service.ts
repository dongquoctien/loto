import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SystemSettingEntity,
  SETTING_KEYS,
  DEFAULT_SETTINGS,
} from './system-setting.entity';

@Injectable()
export class SystemSettingService {
  constructor(
    @InjectRepository(SystemSettingEntity)
    private readonly settingRepository: Repository<SystemSettingEntity>,
  ) {}

  /**
   * Get all settings
   */
  async getAll(): Promise<SystemSettingEntity[]> {
    return this.settingRepository.find({
      order: { key: 'ASC' },
    });
  }

  /**
   * Get a setting by key
   * Returns default value if not found in database
   */
  async get(key: string): Promise<string | null> {
    const setting = await this.settingRepository.findOne({
      where: { key },
    });

    if (setting) {
      return setting.value;
    }

    // Return default if exists
    return DEFAULT_SETTINGS[key] || null;
  }

  /**
   * Get a setting entity by key
   */
  async getByKey(key: string): Promise<SystemSettingEntity | null> {
    return this.settingRepository.findOne({
      where: { key },
    });
  }

  /**
   * Set a setting value (create or update)
   */
  async set(
    key: string,
    value: string | null,
    description?: string,
    valueType?: 'string' | 'number' | 'boolean' | 'json',
  ): Promise<SystemSettingEntity> {
    let setting = await this.settingRepository.findOne({
      where: { key },
    });

    if (setting) {
      setting.value = value;
      if (description !== undefined) {
        setting.description = description;
      }
      if (valueType !== undefined) {
        setting.valueType = valueType;
      }
    } else {
      setting = this.settingRepository.create({
        key,
        value,
        description: description || null,
        valueType: valueType || 'string',
      });
    }

    return this.settingRepository.save(setting);
  }

  /**
   * Delete a setting
   */
  async delete(key: string): Promise<void> {
    const result = await this.settingRepository.delete({ key });
    if (result.affected === 0) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }
  }

  /**
   * Get multiple settings by keys
   * Returns object with key-value pairs
   */
  async getMultiple(keys: string[]): Promise<Record<string, string | null>> {
    const settings = await this.settingRepository.find({
      where: keys.map((key) => ({ key })),
    });

    const result: Record<string, string | null> = {};

    // First, set defaults
    for (const key of keys) {
      result[key] = DEFAULT_SETTINGS[key] || null;
    }

    // Then override with database values
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }

    return result;
  }

  /**
   * Get public settings (for frontend, no auth required)
   * Only returns specific allowed keys
   */
  async getPublicSettings(): Promise<Record<string, string | null>> {
    const publicKeys = [SETTING_KEYS.STICKER_UNAVAILABLE_URL];
    return this.getMultiple(publicKeys);
  }

  /**
   * Initialize default settings if not exist
   */
  async initializeDefaults(): Promise<void> {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await this.settingRepository.findOne({
        where: { key },
      });

      if (!existing) {
        await this.settingRepository.save({
          key,
          value,
          description: this.getDefaultDescription(key),
          valueType: 'string',
        });
      }
    }
  }

  private getDefaultDescription(key: string): string {
    const descriptions: Record<string, string> = {
      [SETTING_KEYS.STICKER_UNAVAILABLE_URL]:
        'URL ảnh hiển thị khi sticker không khả dụng',
    };
    return descriptions[key] || '';
  }
}
