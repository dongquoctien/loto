import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ProfileComponent } from '../profile/profile.component';
import { environment } from '../../../environments/environment';

interface Room {
  id: number;
  roomCode: string;
  name: string;
  ownerId: number;
  owner: { displayName: string; username: string };
  callMode: string;
  pricePerSheet: number;
  status: string;
  players: unknown[];
}

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfileComponent],
  template: `
    <div class="lobby-container">
      <header class="lobby-header">
        <h1>Lô Tô Online</h1>
        <div class="user-info">
          <a class="username-link" href="javascript:void(0)" (click)="showProfile = true">
            <span class="avatar-wrapper">
              @if (user()?.avatarUrl) {
                <img [src]="user()?.avatarUrl" alt="Avatar" class="avatar" />
              } @else {
                <span class="avatar avatar-placeholder">{{ user()?.displayName?.charAt(0)?.toUpperCase() || '?' }}</span>
              }
              <span class="status-dot"></span>
            </span>
            <span class="display-name">{{ user()?.displayName }}</span>
          </a>
          <button (click)="logout()">Đăng xuất</button>
        </div>
      </header>

      <div class="lobby-content">
        <div class="join-section">
          <h3>Vào Phòng Bằng Mã</h3>
          <div class="join-form">
            <input
              [(ngModel)]="joinCode"
              placeholder="Nhập mã phòng"
              maxlength="6"
            />
            <button (click)="joinRoom()" [disabled]="!joinCode">Vào Phòng</button>
          </div>
        </div>

        <div class="create-section">
          <h3>Tạo Phòng Mới</h3>
          <form (ngSubmit)="createRoom()">
            <div class="form-group">
              <label>Tên phòng</label>
              <input [(ngModel)]="roomName" name="roomName" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Chế độ kêu số</label>
                <select [(ngModel)]="callMode" name="callMode">
                  <option value="auto">Tự động</option>
                  <option value="manual">Thủ công</option>
                </select>
              </div>
              <div class="form-group">
                <label>Giá/tờ (VNĐ)</label>
                <input type="text"
                  [ngModel]="priceDisplay"
                  (ngModelChange)="onPriceInput($event)"
                  (blur)="formatPrice()"
                  name="price"
                  inputmode="numeric" />
              </div>
            </div>
            <div class="form-group">
              <label>Luật thắng (Kinh)</label>
              <div class="win-rules">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="winHorizontal" name="winH" />
                  ↔ Hàng ngang
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="winVertical" name="winV" />
                  ↕ Hàng dọc
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="winDiagonal" name="winD" />
                  ⤡ Đường chéo
                </label>
              </div>
            </div>
            <button type="submit" [disabled]="!roomName">Tạo Phòng</button>
          </form>
        </div>

        <div class="rooms-section">
          <h3>Phòng Đang Chờ ({{ rooms().length }})</h3>
          @for (room of rooms(); track room.id) {
            <div class="room-card" (click)="joinByCode(room.roomCode)">
              <div class="room-name">{{ room.name }}</div>
              <div class="room-info">
                <span>Mã: {{ room.roomCode }}</span>
                <span>Chủ: {{ room.owner?.displayName || room.owner?.username }}</span>
                <span>{{ room.pricePerSheet | number }}đ/tờ</span>
                <span>{{ room.players?.length || 0 }} người</span>
              </div>
            </div>
          } @empty {
            <p class="no-rooms">Chưa có phòng nào. Hãy tạo phòng mới!</p>
          }
        </div>
      </div>

      @if (showProfile) {
        <app-profile [isNewUser]="isNewUser" (closed)="onProfileClosed()"></app-profile>
      }
    </div>
  `,
  styles: [`
    .lobby-container { min-height: 100vh; background: #F0F2F5; }
    .lobby-header {
      background: #1877F2;
      color: white; padding: 16px 24px;
      display: flex; justify-content: space-between; align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .lobby-header h1 { margin: 0; font-size: 24px; }
    .user-info { display: flex; gap: 12px; align-items: center; }
    .username-link { color: white; text-decoration: none; font-weight: 600; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.2s; display: flex; align-items: center; gap: 8px; }
    .username-link:hover { background: rgba(255,255,255,0.2); }
    .avatar-wrapper { position: relative; display: inline-block; flex-shrink: 0; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; display: block; border: 2px solid rgba(255,255,255,0.4); box-sizing: border-box; }
    .avatar-placeholder { background: rgba(255,255,255,0.25); color: white; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .status-dot { position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; background: #31A24C; border: 2px solid #1877F2; border-radius: 50%; }
    .user-info button { background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
    .user-info button:hover { background: rgba(255,255,255,0.3); }
    .lobby-content { max-width: 800px; margin: 0 auto; padding: 24px; }
    .join-section, .create-section, .rooms-section {
      background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    h3 { margin-top: 0; color: #1C1E21; }
    .join-form { display: flex; gap: 8px; }
    .join-form input { flex: 1; padding: 10px; border: 1px solid #DDDFE2; border-radius: 6px; text-transform: uppercase; font-size: 18px; letter-spacing: 4px; text-align: center; }
    .join-form input:focus { outline: none; border-color: #1877F2; box-shadow: 0 0 0 2px rgba(24,119,242,0.2); }
    .join-form button { padding: 10px 20px; background: #1877F2; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: background 0.2s; }
    .join-form button:hover { background: #166FE5; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; margin-bottom: 4px; color: #606770; font-size: 14px; }
    .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #DDDFE2; border-radius: 6px; box-sizing: border-box; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #1877F2; box-shadow: 0 0 0 2px rgba(24,119,242,0.2); }
    .form-row { display: flex; gap: 12px; }
    .form-row .form-group { flex: 1; }
    button[type="submit"] { width: 100%; padding: 10px; background: #1877F2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; transition: background 0.2s; }
    button[type="submit"]:hover { background: #166FE5; }
    .room-card { padding: 12px; border: 1px solid #DDDFE2; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; }
    .room-card:hover { border-color: #1877F2; background: #F0F7FF; }
    .room-name { font-weight: 600; font-size: 16px; margin-bottom: 4px; color: #1C1E21; }
    .room-info { display: flex; gap: 16px; color: #65676B; font-size: 13px; flex-wrap: wrap; }
    .no-rooms { color: #65676B; text-align: center; }
    .win-rules { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 4px; }
    .checkbox-label { display: flex; align-items: center; gap: 6px; color: #606770; font-size: 14px; cursor: pointer; }
    .checkbox-label input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: #1877F2; }
  `],
})
export class LobbyComponent implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  user = this.authService.user;
  rooms = signal<Room[]>([]);
  joinCode = '';
  roomName = '';
  callMode = 'auto';
  pricePerSheet = 10000;
  priceDisplay = '10,000';
  winHorizontal = true;
  winVertical = false;
  winDiagonal = false;
  showProfile = false;
  isNewUser = false;

  ngOnInit() {
    this.loadRooms();

    if (this.route.snapshot.queryParams['newUser'] === 'true') {
      this.isNewUser = true;
      this.showProfile = true;
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  loadRooms() {
    this.http.get<Room[]>(`${environment.apiUrl}/rooms`).subscribe({
      next: (rooms) => this.rooms.set(rooms),
    });
  }

  createRoom() {
    this.http
      .post<Room>(`${environment.apiUrl}/rooms`, {
        name: this.roomName,
        callMode: this.callMode,
        pricePerSheet: this.pricePerSheet,
        winHorizontal: this.winHorizontal,
        winVertical: this.winVertical,
        winDiagonal: this.winDiagonal,
      })
      .subscribe({
        next: (room) => {
          this.router.navigate(['/room', room.roomCode]);
        },
      });
  }

  joinRoom() {
    this.joinByCode(this.joinCode);
  }

  joinByCode(code: string) {
    this.router.navigate(['/room', code.toUpperCase()]);
  }

  onPriceInput(value: string) {
    const raw = value.replace(/[^\d]/g, '');
    this.pricePerSheet = parseInt(raw, 10) || 0;
    this.priceDisplay = raw;
  }

  formatPrice() {
    if (this.pricePerSheet < 1000) this.pricePerSheet = 1000;
    this.priceDisplay = this.pricePerSheet.toLocaleString('en-US');
  }

  onProfileClosed() {
    this.showProfile = false;
    this.isNewUser = false;
  }

  logout() {
    this.authService.logout();
  }
}
