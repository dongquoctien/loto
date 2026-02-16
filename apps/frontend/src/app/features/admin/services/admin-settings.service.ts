import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SystemSetting {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingDto {
  value: string;
  description?: string;
  valueType?: 'string' | 'number' | 'boolean' | 'json';
}

/**
 * Known setting keys
 */
export const SETTING_KEYS = {
  STICKER_UNAVAILABLE_URL: 'sticker_unavailable_url',
} as const;

@Injectable({ providedIn: 'root' })
export class AdminSettingsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/admin/settings`;

  /**
   * Get all settings (admin only)
   */
  getAll(): Observable<SystemSetting[]> {
    return this.http.get<SystemSetting[]>(this.baseUrl);
  }

  /**
   * Get a single setting by key
   */
  getByKey(key: string): Observable<SystemSetting> {
    return this.http.get<SystemSetting>(`${this.baseUrl}/${key}`);
  }

  /**
   * Update or create a setting
   */
  update(key: string, dto: UpdateSettingDto): Observable<SystemSetting> {
    return this.http.put<SystemSetting>(`${this.baseUrl}/${key}`, dto);
  }

  /**
   * Delete a setting (revert to default)
   */
  delete(key: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${key}`);
  }
}
