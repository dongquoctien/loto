import { Component, signal, inject, Output, EventEmitter, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { ImageCropperComponent } from './image-cropper.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCropperComponent],
  template: `
    <div class="overlay" (click)="isNewUser ? null : closed.emit()">
      <div class="profile-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ isNewUser ? 'Chào Mừng Bạn!' : 'Hồ Sơ Cá Nhân' }}</h2>
          @if (!isNewUser) {
            <button class="close-btn" (click)="closed.emit()">&times;</button>
          }
        </div>

        @if (isNewUser) {
          <div class="welcome-message">
            Hãy cập nhật hồ sơ của bạn để mọi người nhận ra bạn trong phòng chơi.
            Đừng quên tải lên mã QR chuyển khoản để nhận thưởng nhé!
          </div>
        }

        @if (success()) {
          <div class="success-message">Cập nhật thành công!</div>
        }
        @if (uploadError()) {
          <div class="error-message">{{ uploadError() }}</div>
        }

        <div class="avatar-section">
          @if (user()?.avatarUrl) {
            <img [src]="user()?.avatarUrl" alt="Avatar" class="avatar" />
          } @else {
            <div class="avatar-placeholder">{{ user()?.displayName?.charAt(0) || '?' }}</div>
          }
          <label class="upload-btn">
            Đổi ảnh đại diện
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" (change)="onAvatarUpload($event)" hidden />
          </label>
        </div>

        <form (ngSubmit)="onSave()">
          <div class="form-group">
            <label>Tên hiển thị</label>
            <input [(ngModel)]="displayName" name="displayName" />
          </div>

          <div class="qr-section">
            <label>Mã QR Chuyển Khoản</label>
            @if (user()?.qrCodeUrl) {
              <img [src]="user()?.qrCodeUrl" alt="QR Code" class="qr-image" />
            }
            <label class="upload-btn">
              {{ user()?.qrCodeUrl ? 'Đổi mã QR' : 'Tải lên mã QR' }}
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" (change)="onQrUpload($event)" hidden />
            </label>
          </div>

          <button type="submit" [disabled]="saving()">
            {{ saving() ? 'Đang lưu...' : (isNewUser ? 'Hoàn Tất Hồ Sơ' : 'Lưu Thay Đổi') }}
          </button>
        </form>

        @if (isNewUser) {
          <div class="skip-section">
            <button class="skip-btn" (click)="closed.emit()">Bỏ qua, để sau</button>
          </div>
        }
      </div>
    </div>

    @if (cropperFile()) {
      <app-image-cropper
        [imageFile]="cropperFile()!"
        [shape]="cropperShape()"
        [title]="cropperShape() === 'circle' ? 'Cắt Ảnh Đại Diện' : 'Cắt Mã QR'"
        [outputSize]="cropperShape() === 'circle' ? 400 : 600"
        (cropped)="onCropped($event)"
        (cancel)="closeCropper()"
      />
    }
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .profile-card {
      background: white;
      border-radius: 8px;
      padding: 0;
      width: 90%;
      max-width: 480px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 12px 28px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1);
      animation: slideUp 0.3s ease-out;
    }
    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid #DDDFE2;
    }
    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      color: #1C1E21;
    }
    .close-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: #E4E6EB;
      color: #606770;
      font-size: 22px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      line-height: 1;
    }
    .close-btn:hover { background: #D8DADF; }
    .avatar-section {
      text-align: center;
      padding: 24px 24px 0;
    }
    .avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
      margin: 0 auto 12px;
    }
    .avatar-placeholder {
      width: 100px; height: 100px; border-radius: 50%;
      background: #1877F2; color: white;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 40px; font-weight: bold;
      margin-bottom: 12px;
    }
    .upload-btn {
      display: inline-block;
      color: #1877F2;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 6px;
      transition: background 0.2s;
    }
    .upload-btn:hover { background: #F0F2F5; }
    form { padding: 16px 24px 24px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 6px; color: #606770; font-size: 14px; }
    .form-group input {
      width: 100%; padding: 10px; border: 1px solid #DDDFE2;
      border-radius: 6px; box-sizing: border-box; font-size: 15px;
    }
    .form-group input:focus { outline: none; border-color: #1877F2; box-shadow: 0 0 0 2px rgba(24,119,242,0.2); }
    .qr-section { margin-bottom: 16px; }
    .qr-section > label:first-child { display: block; margin-bottom: 6px; color: #606770; font-size: 14px; cursor: default; }
    .qr-image { max-width: 180px; display: block; margin: 8px 0; border-radius: 8px; }
    button[type="submit"] {
      width: 100%; padding: 10px; background: #1877F2; color: white;
      border: none; border-radius: 6px; cursor: pointer; font-size: 16px;
      font-weight: 600; transition: background 0.2s;
    }
    button[type="submit"]:hover:not(:disabled) { background: #166FE5; }
    button[type="submit"]:disabled { opacity: 0.6; }
    .success-message {
      background: #E7F3EF; color: #00A400; padding: 12px; margin: 16px 24px 0;
      border-radius: 6px; font-size: 14px;
    }
    .error-message {
      background: #FEE7E7; color: #E5343A; padding: 12px; margin: 16px 24px 0;
      border-radius: 6px; font-size: 14px;
    }
    .welcome-message {
      background: #E7F0FF; color: #1877F2; padding: 12px 24px;
      font-size: 14px; line-height: 1.5; border-bottom: 1px solid #DDDFE2;
    }
    .skip-section {
      padding: 0 24px 16px; text-align: center;
    }
    .skip-btn {
      background: none; border: none; color: #65676B; font-size: 14px;
      cursor: pointer; padding: 8px 16px; border-radius: 6px; transition: background 0.2s;
    }
    .skip-btn:hover { background: #F0F2F5; color: #1C1E21; }
  `],
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  @Input() isNewUser = false;
  @Output() closed = new EventEmitter<void>();

  private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  user = this.authService.user;
  displayName = '';
  saving = signal(false);
  success = signal(false);
  uploadError = signal<string | null>(null);

  // Cropper state
  cropperFile = signal<File | null>(null);
  cropperShape = signal<'circle' | 'square'>('circle');
  private cropperField = '';

  ngOnInit() {
    this.displayName = this.user()?.displayName || '';
  }

  onAvatarUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // reset so same file can be re-selected
    if (!file) return;
    if (!this.validateImage(file)) return;
    this.cropperField = 'avatarUrl';
    this.cropperShape.set('circle');
    this.cropperFile.set(file);
  }

  onQrUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!this.validateImage(file)) return;
    this.cropperField = 'qrCodeUrl';
    this.cropperShape.set('square');
    this.cropperFile.set(file);
  }

  onCropped(croppedFile: File) {
    this.closeCropper();
    this.uploadFile(croppedFile, this.cropperField);
  }

  closeCropper() {
    this.cropperFile.set(null);
  }

  private validateImage(file: File): boolean {
    this.uploadError.set(null);
    if (!this.allowedTypes.includes(file.type)) {
      this.uploadError.set('Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP)');
      return false;
    }
    if (file.size > this.maxFileSize) {
      this.uploadError.set('Ảnh không được vượt quá 5MB');
      return false;
    }
    return true;
  }

  onSave() {
    this.saving.set(true);
    this.http
      .put(`${environment.apiUrl}/user/profile`, {
        displayName: this.displayName,
      })
      .subscribe({
        next: (user: any) => {
          this.authService.updateUser(user);
          this.saving.set(false);
          this.success.set(true);
          if (this.isNewUser) {
            setTimeout(() => this.closed.emit(), 1500);
          } else {
            setTimeout(() => this.success.set(false), 3000);
          }
        },
        error: () => this.saving.set(false),
      });
  }

  private uploadFile(file: File, field: string) {
    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ url: string }>(`${environment.apiUrl}/upload/image`, formData).subscribe({
      next: (res) => {
        const baseUrl = environment.apiUrl.replace(/\/api$/, '');
        const fullUrl = `${baseUrl}${res.url}`;
        this.http
          .put(`${environment.apiUrl}/user/profile`, { [field]: fullUrl })
          .subscribe({
            next: (user: any) => this.authService.updateUser(user),
          });
      },
    });
  }
}
