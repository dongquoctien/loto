import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { VOICE_PACKS } from '../../core/services/audio.service';
import { ProfileComponent } from '../profile/profile.component';
import { environment } from '../../../environments/environment';

interface Room {
  id: number;
  roomCode: string;
  name: string;
  ownerId: number;
  owner: { displayName: string; username: string };
  callMode: string;
  callVoice: string;
  autoCallInterval: number;
  pricePerSheet: number;
  winHorizontal: boolean;
  winVertical: boolean;
  winDiagonal: boolean;
  allowHandsFree: boolean;
  status: string;
  players: unknown[];
  password: string | null;
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
          <a class="username-link desktop-only" href="javascript:void(0)" (click)="showProfile = true">
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
          <button class="desktop-only" (click)="logout()">Đăng xuất</button>

          <!-- Mobile dropdown -->
          <div class="mobile-menu">
            <button class="mobile-user-btn" (click)="showUserMenu = !showUserMenu">
              <span class="avatar-wrapper">
                @if (user()?.avatarUrl) {
                  <img [src]="user()?.avatarUrl" alt="Avatar" class="avatar" />
                } @else {
                  <span class="avatar avatar-placeholder">{{ user()?.displayName?.charAt(0)?.toUpperCase() || '?' }}</span>
                }
                <span class="status-dot"></span>
              </span>
              <span class="mobile-display-name">{{ user()?.displayName }}</span>
              <span class="dropdown-arrow">▾</span>
            </button>
            @if (showUserMenu) {
              <div class="dropdown-backdrop" (click)="showUserMenu = false"></div>
              <div class="dropdown-menu">
                <button (click)="showProfile = true; showUserMenu = false">Hồ sơ</button>
                <button (click)="logout()">Đăng xuất</button>
              </div>
            }
          </div>
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
              <input [(ngModel)]="roomName" name="roomName" required autocomplete="off" />
            </div>
            <div class="form-group">
              <label>Mật khẩu phòng (tùy chọn)</label>
              <input  [(ngModel)]="roomPassword" name="roomPassword" placeholder="Để trống nếu không cần" maxlength="50" autocomplete="new-password" />
              @if (roomPassword && roomPassword.length > 0 && roomPassword.length < 4) {
                <span class="field-hint error">Mật khẩu phải có ít nhất 4 ký tự</span>
              }
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
                <label>Giọng kêu số</label>
                <select [(ngModel)]="callVoice" name="callVoice">
                  @for (v of voicePacks; track v.id) {
                    <option [value]="v.id" [disabled]="v.disabled || false">{{ v.label }}{{ v.disabled ? ' (sắp có)' : '' }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-row">
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
            @if (callMode === 'auto') {
              <div class="form-group">
                <label>Thời gian kêu số (giây)</label>
                <div class="interval-options">
                  @for (opt of intervalOptions; track opt) {
                    <button type="button"
                      class="interval-btn"
                      [class.active]="autoCallInterval === opt"
                      (click)="autoCallInterval = opt">
                      {{ opt }}s
                    </button>
                  }
                </div>
              </div>
            }
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
            <div class="form-group">
              <label>Chế độ chơi</label>
              <div class="win-rules">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="allowHandsFree" name="allowHF" />
                  Cho phép Rảnh Tay
                </label>
              </div>
            </div>
            <button type="submit" [disabled]="!roomName || (roomPassword && roomPassword.length > 0 && roomPassword.length < 4)">Tạo Phòng</button>
          </form>
        </div>

        <div class="rooms-section">
          <h3>Phòng Đang Chờ ({{ rooms().length }})</h3>
          @for (room of rooms(); track room.id) {
            <div class="room-card" (click)="joinByCode(room.roomCode)">
              <div class="room-card-top">
                <div class="room-name">{{ room.name }}</div>
                @if (room.password) {
                  <span class="lock-badge" title="Phòng có mật khẩu">🔒</span>
                }
                <span class="room-code-badge">{{ room.roomCode }}</span>
              </div>
              <div class="room-meta">
                <span>{{ room.owner?.displayName || room.owner?.username }}</span>
                <span>{{ room.pricePerSheet | number }}đ/tờ</span>
                <span>{{ room.players?.length || 0 }} người</span>
              </div>
              <div class="room-tags">
                <span class="tag">{{ room.callMode === 'auto' ? '⏱ Tự động ' + room.autoCallInterval + 's' : '✋ Thủ công' }}</span>
                <span class="tag">🎙 {{ getVoiceLabel(room.callVoice) }}</span>
                <span class="tag">🏆 {{ getWinRules(room) }}</span>
                @if (room.allowHandsFree) {
                  <span class="tag tag-hf">🤖 Rảnh tay</span>
                }
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
    .user-info > button { background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
    .user-info > button:hover { background: rgba(255,255,255,0.3); }

    /* Mobile dropdown - hidden on desktop */
    .mobile-menu { display: none; position: relative; }
    .mobile-user-btn { background: none; border: none; padding: 4px 8px; cursor: pointer; border-radius: 6px; transition: background 0.2s; display: flex; align-items: center; gap: 8px; color: white; }
    .mobile-user-btn:hover { background: rgba(255,255,255,0.2); }
    .mobile-display-name { font-size: 14px; font-weight: 600; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dropdown-arrow { font-size: 12px; opacity: 0.8; }
    .dropdown-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 99; }
    .dropdown-menu {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 100;
      background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 160px; overflow: hidden;
    }
    .dropdown-menu button {
      width: 100%; padding: 10px 16px; border: none; background: none;
      text-align: left; cursor: pointer; font-size: 14px; color: #1C1E21; transition: background 0.15s;
    }
    .dropdown-menu button:hover { background: #F0F2F5; }
    .lobby-content { max-width: 800px; margin: 0 auto; padding: 24px; }
    .join-section, .create-section, .rooms-section {
      background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    h3 { margin-top: 0; color: #1C1E21; padding: 8px 0;}
    .join-form { display: flex; gap: 8px; }
    .join-form input { flex: 1; padding: 10px; border: 1px solid #DDDFE2; border-radius: 6px; text-transform: uppercase; font-size: 18px; letter-spacing: 4px; text-align: center; }
    .join-form input:focus { outline: none; border-color: #1877F2; box-shadow: 0 0 0 2px rgba(24,119,242,0.2); }
    .join-form button { padding: 10px 20px; background: #1877F2; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: background 0.2s; }
    .join-form button:hover { background: #166FE5; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; margin-bottom: 4px; color: #606770; font-size: 14px; }
    .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #DDDFE2; border-radius: 6px; box-sizing: border-box; font-size: 16px; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #1877F2; box-shadow: 0 0 0 2px rgba(24,119,242,0.2); }
    .field-hint { display: block; font-size: 12px; margin-top: 4px; }
    .field-hint.error { color: #FA383E; }
    .form-row { display: flex; gap: 12px; }
    .form-row .form-group { flex: 1; }
    button[type="submit"] { width: 100%; padding: 10px; background: #1877F2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; transition: background 0.2s; }
    button[type="submit"]:hover { background: #166FE5; }
    .room-card { padding: 12px 14px; border: 1px solid #DDDFE2; border-radius: 10px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; }
    .room-card:hover { border-color: #1877F2; background: #F0F7FF; }
    .room-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .room-name { font-weight: 600; font-size: 16px; color: #1C1E21; }
    .room-code-badge { background: #1877F2; color: white; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px; letter-spacing: 0.5px; }
    .lock-badge { font-size: 14px; }
    .room-meta { display: flex; gap: 12px; color: #65676B; font-size: 13px; flex-wrap: wrap; margin-bottom: 8px; }
    .room-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag { background: #F0F2F5; color: #4B4F56; font-size: 12px; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
    .tag-hf { background: #E8F5E9; color: #2E7D32; }
    .no-rooms { color: #65676B; text-align: center; }
    .win-rules { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 4px; }
    .checkbox-label { display: flex; align-items: center; gap: 6px; color: #606770; font-size: 14px; cursor: pointer; }
    .checkbox-label input[type="checkbox"] { width: 18px; height: 18px; }
    .interval-options { display: flex; gap: 8px; margin-top: 4px; }
    .interval-btn {
      flex: 1; padding: 8px 0; border: 2px solid #DDDFE2; border-radius: 8px;
      background: white; color: #1C1E21; font-size: 15px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .interval-btn:hover { border-color: #1877F2; color: #1877F2; }
    .interval-btn.active { background: #1877F2; color: white; border-color: #1877F2; }
    @media (max-width: 768px) {
      .join-form { flex-direction: column; }
      .join-form button { width: 100%; }
      .desktop-only { display: none !important; }
      .mobile-menu { display: block; }
      .lobby-header h1 { font-size: 18px; }
      .lobby-content { padding: 16px; }
    }
  `],
})
export class LobbyComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  user = this.authService.user;
  rooms = signal<Room[]>([]);
  joinCode = '';
  roomName = '';
  callMode = 'auto';
  callVoice = 'default';
  voicePacks = VOICE_PACKS;
  autoCallInterval = 5;
  intervalOptions = [2, 3, 5, 7];
  pricePerSheet = 5000;
  priceDisplay = '5,000';
  winHorizontal = true;
  winVertical = false;
  winDiagonal = false;
  allowHandsFree = false;
  roomPassword = '';
  showProfile = false;
  showUserMenu = false;
  isNewUser = false;

  ngOnInit() {
    this.loadRooms();
    this.setupSocketListeners();

    if (this.route.snapshot.queryParams['newUser'] === 'true') {
      this.isNewUser = true;
      this.showProfile = true;
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSocketListeners() {
    this.socketService.connect();

    // Listen for room creation
    this.socketService
      .on<Room>('room:created')
      .pipe(takeUntil(this.destroy$))
      .subscribe((room) => {
        this.rooms.update((rooms) => [room, ...rooms]);
      });

    // Listen for room deletion (owner left)
    this.socketService
      .on<{ roomId: number }>('room:deleted')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ roomId }) => {
        this.rooms.update((rooms) => rooms.filter((r) => r.id !== roomId));
      });
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
        password: this.roomPassword && this.roomPassword.length >= 4 ? this.roomPassword : undefined,
        callMode: this.callMode,
        callVoice: this.callVoice,
        autoCallInterval: this.callMode === 'auto' ? this.autoCallInterval : undefined,
        pricePerSheet: this.pricePerSheet,
        winHorizontal: this.winHorizontal,
        winVertical: this.winVertical,
        winDiagonal: this.winDiagonal,
        allowHandsFree: this.allowHandsFree,
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

  getVoiceLabel(voiceId: string): string {
    return VOICE_PACKS.find(v => v.id === voiceId)?.label ?? 'Mặc định';
  }

  getWinRules(room: Room): string {
    const rules: string[] = [];
    if (room.winHorizontal) rules.push('Ngang');
    if (room.winVertical) rules.push('Dọc');
    if (room.winDiagonal) rules.push('Chéo');
    return rules.length ? rules.join(', ') : 'Ngang';
  }

  onProfileClosed() {
    this.showProfile = false;
    this.isNewUser = false;
  }

  logout() {
    this.authService.logout();
  }
}
