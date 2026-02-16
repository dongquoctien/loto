import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_settings')
export class SystemSettingEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'setting_key', type: 'varchar', length: 100, unique: true })
  key!: string;

  @Column({ name: 'setting_value', type: 'text', nullable: true })
  value!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ name: 'value_type', type: 'varchar', length: 20, default: 'string' })
  valueType!: 'string' | 'number' | 'boolean' | 'json';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

/**
 * Known system setting keys
 */
export const SETTING_KEYS = {
  STICKER_UNAVAILABLE_URL: 'sticker_unavailable_url',
  // Add more keys here as needed
} as const;

/**
 * Default values for settings
 */
export const DEFAULT_SETTINGS: Record<string, string> = {
  [SETTING_KEYS.STICKER_UNAVAILABLE_URL]: '/assets/sticker-unavailable.jpg',
};
