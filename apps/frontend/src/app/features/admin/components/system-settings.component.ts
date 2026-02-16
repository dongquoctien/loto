import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  iconoirFloppyDisk,
  iconoirRefresh,
  iconoirCheck,
  iconoirWarningTriangle,
} from '@ng-icons/iconoir';
import {
  AdminSettingsService,
  SystemSetting,
  SETTING_KEYS,
} from '../services/admin-settings.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  viewProviders: [
    provideIcons({
      iconoirFloppyDisk,
      iconoirRefresh,
      iconoirCheck,
      iconoirWarningTriangle,
    }),
  ],
  template: `
    <div class="settings-page">
      <header class="page-header">
        <h1>Cài đặt hệ thống</h1>
        <button class="btn btn-secondary" (click)="loadSettings()">
          <ng-icon name="iconoirRefresh"></ng-icon>
          Làm mới
        </button>
      </header>

      @if (loading()) {
        <div class="loading">Đang tải...</div>
      } @else {
        <!-- Sticker Settings Section -->
        <div class="settings-section">
          <h2>Cài đặt Sticker</h2>

          <div class="setting-card">
            <div class="setting-info">
              <h3>Ảnh Sticker không khả dụng</h3>
              <p>
                Ảnh này sẽ hiển thị khi sticker đã bị xóa hoặc không tìm thấy.
                Được sử dụng trong chat khi người dùng gửi sticker không còn tồn tại.
              </p>
            </div>

            <div class="setting-form">
              <div class="preview-section">
                @if (stickerUnavailableUrl()) {
                  <img
                    [src]="stickerUnavailableUrl()"
                    alt="Preview"
                    class="preview-image"
                    (error)="onImageError()"
                  />
                } @else {
                  <div class="preview-placeholder">Chưa có ảnh</div>
                }
              </div>

              <div class="input-section">
                <label>URL ảnh</label>
                <input
                  type="text"
                  [(ngModel)]="stickerUnavailableUrl"
                  placeholder="https://example.com/image.jpg hoặc /assets/image.jpg"
                  (input)="onUrlChange()"
                />
                <span class="hint">
                  Có thể dùng URL bên ngoài hoặc đường dẫn asset nội bộ (bắt đầu bằng /)
                </span>

                @if (imageError()) {
                  <div class="error-message">
                    <ng-icon name="iconoirWarningTriangle"></ng-icon>
                    Không thể tải ảnh từ URL này
                  </div>
                }
              </div>

              <div class="action-section">
                <button
                  class="btn btn-primary"
                  (click)="saveStickerUnavailable()"
                  [disabled]="saving() || !hasChanges()"
                >
                  @if (saving()) {
                    Đang lưu...
                  } @else if (saved()) {
                    <ng-icon name="iconoirCheck"></ng-icon>
                    Đã lưu
                  } @else {
                    <ng-icon name="iconoirFloppyDisk"></ng-icon>
                    Lưu thay đổi
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- More settings sections can be added here -->
      }
    </div>
  `,
  styles: [`
    .settings-page {
      max-width: 800px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .page-header h1 {
      margin: 0;
      font-size: 24px;
      color: #1C1E21;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #1877F2;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #166FE5;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #E4E6EB;
      color: #1C1E21;
    }

    .btn-secondary:hover {
      background: #D8DADF;
    }

    .loading {
      text-align: center;
      padding: 48px;
      color: #65676B;
    }

    .settings-section {
      margin-bottom: 32px;
    }

    .settings-section h2 {
      font-size: 18px;
      color: #1C1E21;
      margin: 0 0 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #E4E6EB;
    }

    .setting-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .setting-info {
      margin-bottom: 20px;
    }

    .setting-info h3 {
      margin: 0 0 8px;
      font-size: 16px;
      color: #1C1E21;
    }

    .setting-info p {
      margin: 0;
      font-size: 14px;
      color: #65676B;
      line-height: 1.5;
    }

    .setting-form {
      display: grid;
      grid-template-columns: 120px 1fr auto;
      gap: 20px;
      align-items: start;
    }

    .preview-section {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .preview-image {
      width: 100px;
      height: 100px;
      object-fit: contain;
      border-radius: 8px;
      background: #F7F8FA;
      padding: 8px;
    }

    .preview-placeholder {
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F7F8FA;
      border-radius: 8px;
      color: #65676B;
      font-size: 12px;
      text-align: center;
    }

    .input-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .input-section label {
      font-size: 14px;
      font-weight: 500;
      color: #1C1E21;
    }

    .input-section input {
      padding: 12px;
      border: 1px solid #E4E6EB;
      border-radius: 8px;
      font-size: 14px;
      width: 100%;
    }

    .input-section input:focus {
      outline: none;
      border-color: #1877F2;
      box-shadow: 0 0 0 2px rgba(24,119,242,0.2);
    }

    .hint {
      font-size: 12px;
      color: #65676B;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #FA383E;
      font-size: 13px;
    }

    .action-section {
      display: flex;
      align-items: flex-start;
      padding-top: 24px;
    }

    @media (max-width: 768px) {
      .setting-form {
        grid-template-columns: 1fr;
      }

      .preview-section {
        justify-content: flex-start;
      }

      .action-section {
        padding-top: 0;
      }
    }
  `],
})
export class SystemSettingsComponent implements OnInit {
  private settingsService = inject(AdminSettingsService);

  loading = signal(false);
  saving = signal(false);
  saved = signal(false);
  imageError = signal(false);

  // Sticker unavailable setting
  stickerUnavailableUrl = signal('/assets/sticker-unavailable.jpg');
  originalStickerUnavailableUrl = '';

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading.set(true);
    this.settingsService.getAll().subscribe({
      next: (settings) => {
        const stickerSetting = settings.find(
          (s) => s.key === SETTING_KEYS.STICKER_UNAVAILABLE_URL
        );
        if (stickerSetting?.value) {
          this.stickerUnavailableUrl.set(stickerSetting.value);
          this.originalStickerUnavailableUrl = stickerSetting.value;
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  hasChanges(): boolean {
    return this.stickerUnavailableUrl() !== this.originalStickerUnavailableUrl;
  }

  onUrlChange() {
    this.saved.set(false);
    this.imageError.set(false);
  }

  onImageError() {
    this.imageError.set(true);
  }

  saveStickerUnavailable() {
    const url = this.stickerUnavailableUrl();
    if (!url) return;

    this.saving.set(true);
    this.settingsService
      .update(SETTING_KEYS.STICKER_UNAVAILABLE_URL, {
        value: url,
        description: 'URL ảnh hiển thị khi sticker không khả dụng',
      })
      .subscribe({
        next: () => {
          this.originalStickerUnavailableUrl = url;
          this.saving.set(false);
          this.saved.set(true);

          // Reset saved status after 3 seconds
          setTimeout(() => {
            this.saved.set(false);
          }, 3000);
        },
        error: () => {
          this.saving.set(false);
        },
      });
  }
}
