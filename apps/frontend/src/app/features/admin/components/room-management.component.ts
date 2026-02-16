import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  iconoirSearch,
  iconoirRefresh,
  iconoirEye,
  iconoirEditPencil,
  iconoirTrash,
  iconoirXmark,
  iconoirCheck,
  iconoirWarningTriangle,
  iconoirLock,
  iconoirUser,
  iconoirGroup,
  iconoirPlay,
  iconoirPause,
  iconoirNavArrowLeft,
  iconoirNavArrowRight,
} from '@ng-icons/iconoir';
import {
  AdminRoomService,
  AdminRoom,
  AdminRoomDetail,
  AdminRoomPlayer,
  RoomStats,
  RoomStatus,
  RoomFilter,
} from '../services/admin-room.service';

type ModalType = 'view' | 'edit' | 'close' | 'delete' | 'removePlayer' | null;

@Component({
  selector: 'app-room-management',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  viewProviders: [
    provideIcons({
      iconoirSearch,
      iconoirRefresh,
      iconoirEye,
      iconoirEditPencil,
      iconoirTrash,
      iconoirXmark,
      iconoirCheck,
      iconoirWarningTriangle,
      iconoirLock,
      iconoirUser,
      iconoirGroup,
      iconoirPlay,
      iconoirPause,
      iconoirNavArrowLeft,
      iconoirNavArrowRight,
    }),
  ],
  template: `
    <div class="room-management">
      <header class="page-header">
        <h1>Quản lý Phòng</h1>
        <button class="btn-refresh" (click)="loadRooms()">
          <ng-icon name="iconoirRefresh"></ng-icon>
          Làm mới
        </button>
      </header>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats()?.total || 0 }}</div>
          <div class="stat-label">Tổng phòng</div>
        </div>
        <div class="stat-card waiting">
          <div class="stat-value">{{ stats()?.waiting || 0 }}</div>
          <div class="stat-label">Đang chờ</div>
        </div>
        <div class="stat-card playing">
          <div class="stat-value">{{ stats()?.playing || 0 }}</div>
          <div class="stat-label">Đang chơi</div>
        </div>
        <div class="stat-card closed">
          <div class="stat-value">{{ stats()?.closed || 0 }}</div>
          <div class="stat-label">Đã đóng</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="search-box">
          <ng-icon name="iconoirSearch"></ng-icon>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã phòng..."
            [(ngModel)]="searchTerm"
            (input)="onSearchChange()"
          />
        </div>
        <select [(ngModel)]="statusFilter" (change)="onFilterChange()">
          <option value="">Tất cả trạng thái</option>
          <option value="waiting">Đang chờ</option>
          <option value="playing">Đang chơi</option>
          <option value="closed">Đã đóng</option>
        </select>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="loading">Đang tải...</div>
      }

      <!-- Room Table -->
      @if (!loading() && rooms().length > 0) {
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã phòng</th>
                <th>Tên phòng</th>
                <th>Chủ phòng</th>
                <th>Người chơi</th>
                <th>Trạng thái</th>
                <th>Mật khẩu</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              @for (room of rooms(); track room.id) {
                <tr>
                  <td class="room-code">{{ room.roomCode }}</td>
                  <td>{{ room.name }}</td>
                  <td>{{ room.ownerName }}</td>
                  <td>
                    <span class="player-count">
                      {{ room.playerCount }}/{{ room.maxPlayers }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" [class]="room.status">
                      {{ getStatusLabel(room.status) }}
                    </span>
                  </td>
                  <td>
                    @if (room.hasPassword) {
                      <ng-icon name="iconoirLock" class="has-password"></ng-icon>
                    } @else {
                      <span class="no-password">-</span>
                    }
                  </td>
                  <td>{{ formatDate(room.createdAt) }}</td>
                  <td class="actions">
                    <button class="btn-icon" title="Xem chi tiết" (click)="viewRoom(room)">
                      <ng-icon name="iconoirEye"></ng-icon>
                    </button>
                    <button class="btn-icon" title="Chỉnh sửa" (click)="editRoom(room)">
                      <ng-icon name="iconoirEditPencil"></ng-icon>
                    </button>
                    @if (room.status !== 'closed') {
                      <button class="btn-icon warning" title="Đóng phòng" (click)="confirmClose(room)">
                        <ng-icon name="iconoirPause"></ng-icon>
                      </button>
                    }
                    <button class="btn-icon danger" title="Xóa phòng" (click)="confirmDelete(room)">
                      <ng-icon name="iconoirTrash"></ng-icon>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination">
          <span class="page-info">
            Trang {{ currentPage() }} / {{ totalPages() }} ({{ total() }} phòng)
          </span>
          <div class="page-buttons">
            <button
              [disabled]="currentPage() <= 1"
              (click)="goToPage(currentPage() - 1)"
            >
              <ng-icon name="iconoirNavArrowLeft"></ng-icon>
            </button>
            <button
              [disabled]="currentPage() >= totalPages()"
              (click)="goToPage(currentPage() + 1)"
            >
              <ng-icon name="iconoirNavArrowRight"></ng-icon>
            </button>
          </div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && rooms().length === 0) {
        <div class="empty-state">
          <ng-icon name="iconoirGroup"></ng-icon>
          <p>Không tìm thấy phòng nào</p>
        </div>
      }

      <!-- View Room Modal -->
      @if (modalType() === 'view' && selectedRoom()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Chi tiết phòng</h2>
              <button class="btn-close" (click)="closeModal()">
                <ng-icon name="iconoirXmark"></ng-icon>
              </button>
            </div>
            <div class="modal-body">
              <div class="detail-grid">
                <div class="detail-item">
                  <label>Mã phòng</label>
                  <span class="room-code-large">{{ selectedRoom()!.roomCode }}</span>
                </div>
                <div class="detail-item">
                  <label>Tên phòng</label>
                  <span>{{ selectedRoom()!.name }}</span>
                </div>
                <div class="detail-item">
                  <label>Chủ phòng</label>
                  <span>{{ selectedRoom()!.owner?.displayName || selectedRoom()!.owner?.username }}</span>
                </div>
                <div class="detail-item">
                  <label>Trạng thái</label>
                  <span class="status-badge" [class]="selectedRoom()!.status">
                    {{ getStatusLabel(selectedRoom()!.status) }}
                  </span>
                </div>
                <div class="detail-item">
                  <label>Chế độ gọi số</label>
                  <span>{{ selectedRoom()!.callMode === 'auto' ? 'Tự động' : 'Thủ công' }}</span>
                </div>
                <div class="detail-item">
                  <label>Giá mỗi vé</label>
                  <span>{{ selectedRoom()!.pricePerSheet?.toLocaleString() }}đ</span>
                </div>
                <div class="detail-item">
                  <label>Số người tối đa</label>
                  <span>{{ selectedRoom()!.maxPlayers }}</span>
                </div>
                <div class="detail-item">
                  <label>Mật khẩu</label>
                  <span>{{ selectedRoom()!.hasPassword ? 'Có' : 'Không' }}</span>
                </div>
              </div>

              <!-- Players List -->
              <div class="players-section">
                <h3>Người chơi ({{ roomPlayers().length }})</h3>
                @if (roomPlayers().length > 0) {
                  <div class="players-list">
                    @for (player of roomPlayers(); track player.id) {
                      <div class="player-item" [class.owner]="player.userId === selectedRoom()!.ownerId">
                        <div class="player-info">
                          <span class="player-name">
                            {{ player.displayName || player.username }}
                            @if (player.userId === selectedRoom()!.ownerId) {
                              <span class="owner-badge">Chủ phòng</span>
                            }
                          </span>
                          <span class="player-status" [class.online]="player.isOnline">
                            {{ player.isOnline ? 'Online' : 'Offline' }}
                          </span>
                        </div>
                        @if (player.userId !== selectedRoom()!.ownerId) {
                          <button
                            class="btn-remove"
                            (click)="confirmRemovePlayer(player)"
                          >
                            Xóa
                          </button>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <p class="no-players">Chưa có người chơi</p>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Edit Room Modal -->
      @if (modalType() === 'edit' && selectedRoom()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Chỉnh sửa phòng</h2>
              <button class="btn-close" (click)="closeModal()">
                <ng-icon name="iconoirXmark"></ng-icon>
              </button>
            </div>
            <div class="modal-body">
              <form (ngSubmit)="saveRoom()">
                <div class="form-group">
                  <label>Tên phòng</label>
                  <input type="text" [(ngModel)]="editForm.name" name="name" />
                </div>
                <div class="form-group">
                  <label>Trạng thái</label>
                  <select [(ngModel)]="editForm.status" name="status">
                    <option value="waiting">Đang chờ</option>
                    <option value="playing">Đang chơi</option>
                    <option value="closed">Đã đóng</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Chế độ gọi số</label>
                  <select [(ngModel)]="editForm.callMode" name="callMode">
                    <option value="auto">Tự động</option>
                    <option value="manual">Thủ công</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Khoảng cách gọi số (giây)</label>
                  <input
                    type="number"
                    [(ngModel)]="editForm.autoCallInterval"
                    name="autoCallInterval"
                    min="1"
                    max="30"
                  />
                </div>
                <div class="form-group">
                  <label>Giá mỗi vé</label>
                  <input
                    type="number"
                    [(ngModel)]="editForm.pricePerSheet"
                    name="pricePerSheet"
                    min="0"
                  />
                </div>
                <div class="form-group">
                  <label>Số người tối đa</label>
                  <input
                    type="number"
                    [(ngModel)]="editForm.maxPlayers"
                    name="maxPlayers"
                    min="2"
                    max="50"
                  />
                </div>
                <div class="form-actions">
                  <button type="button" class="btn-cancel" (click)="closeModal()">Hủy</button>
                  <button type="submit" class="btn-save" [disabled]="saving()">
                    {{ saving() ? 'Đang lưu...' : 'Lưu' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- Close Room Confirm Modal -->
      @if (modalType() === 'close' && selectedRoom()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header warning">
              <ng-icon name="iconoirWarningTriangle"></ng-icon>
              <h2>Đóng phòng</h2>
            </div>
            <div class="modal-body">
              <p>Bạn có chắc muốn đóng phòng <strong>{{ selectedRoom()!.name }}</strong>?</p>
              <p class="warning-text">Hành động này sẽ kết thúc game đang diễn ra (nếu có).</p>
              <div class="form-group">
                <label>Lý do (tùy chọn)</label>
                <textarea
                  [(ngModel)]="closeReason"
                  placeholder="Nhập lý do đóng phòng..."
                ></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn-cancel" (click)="closeModal()">Hủy</button>
                <button type="button" class="btn-warning" (click)="doCloseRoom()" [disabled]="saving()">
                  {{ saving() ? 'Đang xử lý...' : 'Đóng phòng' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Delete Room Confirm Modal -->
      @if (modalType() === 'delete' && selectedRoom()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header danger">
              <ng-icon name="iconoirWarningTriangle"></ng-icon>
              <h2>Xóa phòng</h2>
            </div>
            <div class="modal-body">
              <p>Bạn có chắc muốn xóa phòng <strong>{{ selectedRoom()!.name }}</strong>?</p>
              <p class="danger-text">Hành động này không thể hoàn tác!</p>
              <div class="form-actions">
                <button type="button" class="btn-cancel" (click)="closeModal()">Hủy</button>
                <button type="button" class="btn-danger" (click)="doDeleteRoom()" [disabled]="saving()">
                  {{ saving() ? 'Đang xóa...' : 'Xóa phòng' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Remove Player Confirm Modal -->
      @if (modalType() === 'removePlayer' && selectedPlayer()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header warning">
              <ng-icon name="iconoirWarningTriangle"></ng-icon>
              <h2>Xóa người chơi</h2>
            </div>
            <div class="modal-body">
              <p>
                Bạn có chắc muốn xóa
                <strong>{{ selectedPlayer()!.displayName || selectedPlayer()!.username }}</strong>
                khỏi phòng?
              </p>
              <div class="form-group">
                <label>Lý do (tùy chọn)</label>
                <textarea
                  [(ngModel)]="removePlayerReason"
                  placeholder="Nhập lý do..."
                ></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn-cancel" (click)="closeModal()">Hủy</button>
                <button type="button" class="btn-warning" (click)="doRemovePlayer()" [disabled]="saving()">
                  {{ saving() ? 'Đang xử lý...' : 'Xóa người chơi' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .room-management {
      max-width: 1200px;
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

    .btn-refresh {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #1877F2;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-refresh:hover {
      background: #166FE5;
    }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #1C1E21;
    }

    .stat-label {
      font-size: 14px;
      color: #65676B;
      margin-top: 4px;
    }

    .stat-card.waiting .stat-value { color: #F7B928; }
    .stat-card.playing .stat-value { color: #31A24C; }
    .stat-card.closed .stat-value { color: #65676B; }

    /* Filters */
    .filters {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      background: white;
      border: 1px solid #E4E6EB;
      border-radius: 8px;
      padding: 0 12px;
    }

    .search-box ng-icon {
      color: #65676B;
    }

    .search-box input {
      flex: 1;
      border: none;
      padding: 12px;
      font-size: 14px;
      outline: none;
    }

    .filters select {
      padding: 12px 16px;
      border: 1px solid #E4E6EB;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      min-width: 180px;
    }

    /* Loading */
    .loading {
      text-align: center;
      padding: 48px;
      color: #65676B;
    }

    /* Table */
    .table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th {
      text-align: left;
      padding: 16px;
      background: #F0F2F5;
      font-weight: 600;
      font-size: 13px;
      color: #65676B;
      border-bottom: 1px solid #E4E6EB;
    }

    .data-table td {
      padding: 16px;
      border-bottom: 1px solid #E4E6EB;
      font-size: 14px;
    }

    .data-table tr:hover {
      background: #F7F8FA;
    }

    .room-code {
      font-family: monospace;
      font-weight: 600;
      color: #1877F2;
    }

    .player-count {
      background: #E7F3FF;
      color: #1877F2;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 13px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.waiting {
      background: #FFF4E5;
      color: #E8850C;
    }

    .status-badge.playing {
      background: #E7F6EC;
      color: #31A24C;
    }

    .status-badge.closed {
      background: #F0F2F5;
      color: #65676B;
    }

    .has-password {
      color: #E8850C;
    }

    .no-password {
      color: #BCC0C4;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      width: 32px;
      height: 32px;
      border: none;
      background: #F0F2F5;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #1C1E21;
    }

    .btn-icon:hover {
      background: #E4E6EB;
    }

    .btn-icon.warning {
      color: #E8850C;
    }

    .btn-icon.danger {
      color: #FA383E;
    }

    /* Pagination */
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: white;
      border-radius: 0 0 12px 12px;
    }

    .page-info {
      color: #65676B;
      font-size: 14px;
    }

    .page-buttons {
      display: flex;
      gap: 8px;
    }

    .page-buttons button {
      width: 36px;
      height: 36px;
      border: 1px solid #E4E6EB;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page-buttons button:hover:not(:disabled) {
      background: #F0F2F5;
    }

    .page-buttons button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 64px;
      background: white;
      border-radius: 12px;
    }

    .empty-state ng-icon {
      font-size: 48px;
      color: #BCC0C4;
    }

    .empty-state p {
      margin-top: 16px;
      color: #65676B;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal.modal-sm {
      max-width: 450px;
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px;
      border-bottom: 1px solid #E4E6EB;
    }

    .modal-header h2 {
      margin: 0;
      flex: 1;
      font-size: 18px;
    }

    .modal-header.warning {
      background: #FFF4E5;
    }

    .modal-header.warning ng-icon {
      color: #E8850C;
      font-size: 24px;
    }

    .modal-header.danger {
      background: #FFEBE9;
    }

    .modal-header.danger ng-icon {
      color: #FA383E;
      font-size: 24px;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      color: #65676B;
    }

    .modal-body {
      padding: 20px;
    }

    /* Detail Grid */
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item label {
      font-size: 12px;
      color: #65676B;
      text-transform: uppercase;
    }

    .detail-item span {
      font-size: 14px;
      color: #1C1E21;
    }

    .room-code-large {
      font-family: monospace;
      font-size: 18px !important;
      font-weight: 700;
      color: #1877F2 !important;
    }

    /* Players Section */
    .players-section {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #E4E6EB;
    }

    .players-section h3 {
      margin: 0 0 16px;
      font-size: 16px;
    }

    .players-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .player-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #F7F8FA;
      border-radius: 8px;
    }

    .player-item.owner {
      background: #E7F3FF;
    }

    .player-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .player-name {
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .owner-badge {
      font-size: 11px;
      background: #1877F2;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .player-status {
      font-size: 12px;
      color: #65676B;
    }

    .player-status.online {
      color: #31A24C;
    }

    .btn-remove {
      padding: 6px 12px;
      background: #FFEBE9;
      color: #FA383E;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }

    .btn-remove:hover {
      background: #FA383E;
      color: white;
    }

    .no-players {
      color: #65676B;
      font-style: italic;
    }

    /* Form */
    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      font-size: 14px;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #E4E6EB;
      border-radius: 8px;
      font-size: 14px;
    }

    .form-group textarea {
      min-height: 80px;
      resize: vertical;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .btn-cancel {
      padding: 12px 24px;
      background: #F0F2F5;
      color: #1C1E21;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-save {
      padding: 12px 24px;
      background: #1877F2;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-save:hover {
      background: #166FE5;
    }

    .btn-save:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-warning {
      padding: 12px 24px;
      background: #E8850C;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-danger {
      padding: 12px 24px;
      background: #FA383E;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .warning-text {
      color: #E8850C;
      font-size: 13px;
    }

    .danger-text {
      color: #FA383E;
      font-size: 13px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .filters {
        flex-direction: column;
      }

      .filters select {
        width: 100%;
      }

      .table-container {
        overflow-x: auto;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class RoomManagementComponent implements OnInit {
  private roomService = inject(AdminRoomService);

  // State
  rooms = signal<AdminRoom[]>([]);
  stats = signal<RoomStats | null>(null);
  loading = signal(false);
  saving = signal(false);

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);

  // Filters
  searchTerm = '';
  statusFilter: RoomStatus | '' = '';
  private searchTimeout: any;

  // Modal
  modalType = signal<ModalType>(null);
  selectedRoom = signal<AdminRoomDetail | null>(null);
  roomPlayers = signal<AdminRoomPlayer[]>([]);
  selectedPlayer = signal<AdminRoomPlayer | null>(null);

  // Form data
  editForm = {
    name: '',
    status: 'waiting' as RoomStatus,
    callMode: 'auto' as 'auto' | 'manual',
    autoCallInterval: 5,
    pricePerSheet: 10000,
    maxPlayers: 20,
  };
  closeReason = '';
  removePlayerReason = '';

  ngOnInit() {
    this.loadRooms();
    this.loadStats();
  }

  loadRooms() {
    this.loading.set(true);

    const filter: RoomFilter = {
      page: this.currentPage(),
      limit: 20,
    };

    if (this.searchTerm) {
      filter.search = this.searchTerm;
    }

    if (this.statusFilter) {
      filter.status = this.statusFilter;
    }

    this.roomService.getAll(filter).subscribe({
      next: (res) => {
        this.rooms.set(res.rooms);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load rooms:', err);
        this.loading.set(false);
      },
    });
  }

  loadStats() {
    this.roomService.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err) => console.error('Failed to load stats:', err),
    });
  }

  onSearchChange() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadRooms();
    }, 300);
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadRooms();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadRooms();
  }

  getStatusLabel(status: RoomStatus): string {
    const labels: Record<RoomStatus, string> = {
      waiting: 'Đang chờ',
      playing: 'Đang chơi',
      closed: 'Đã đóng',
    };
    return labels[status] || status;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // View Room
  viewRoom(room: AdminRoom) {
    this.roomService.getById(room.id).subscribe({
      next: (detail) => {
        this.selectedRoom.set(detail);
        this.modalType.set('view');
        this.loadRoomPlayers(room.id);
      },
      error: (err) => console.error('Failed to load room:', err),
    });
  }

  loadRoomPlayers(roomId: number) {
    this.roomService.getPlayers(roomId).subscribe({
      next: (players) => this.roomPlayers.set(players),
      error: (err) => console.error('Failed to load players:', err),
    });
  }

  // Edit Room
  editRoom(room: AdminRoom) {
    this.roomService.getById(room.id).subscribe({
      next: (detail) => {
        this.selectedRoom.set(detail);
        this.editForm = {
          name: detail.name,
          status: detail.status,
          callMode: detail.callMode,
          autoCallInterval: detail.autoCallInterval,
          pricePerSheet: detail.pricePerSheet,
          maxPlayers: detail.maxPlayers,
        };
        this.modalType.set('edit');
      },
      error: (err) => console.error('Failed to load room:', err),
    });
  }

  saveRoom() {
    if (!this.selectedRoom()) return;

    this.saving.set(true);
    this.roomService.update(this.selectedRoom()!.id, this.editForm).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadRooms();
        this.loadStats();
      },
      error: (err) => {
        console.error('Failed to save room:', err);
        this.saving.set(false);
      },
    });
  }

  // Close Room
  confirmClose(room: AdminRoom) {
    this.roomService.getById(room.id).subscribe({
      next: (detail) => {
        this.selectedRoom.set(detail);
        this.closeReason = '';
        this.modalType.set('close');
      },
    });
  }

  doCloseRoom() {
    if (!this.selectedRoom()) return;

    this.saving.set(true);
    this.roomService.close(this.selectedRoom()!.id, this.closeReason).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadRooms();
        this.loadStats();
      },
      error: (err) => {
        console.error('Failed to close room:', err);
        this.saving.set(false);
      },
    });
  }

  // Delete Room
  confirmDelete(room: AdminRoom) {
    this.roomService.getById(room.id).subscribe({
      next: (detail) => {
        this.selectedRoom.set(detail);
        this.modalType.set('delete');
      },
    });
  }

  doDeleteRoom() {
    if (!this.selectedRoom()) return;

    this.saving.set(true);
    this.roomService.delete(this.selectedRoom()!.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadRooms();
        this.loadStats();
      },
      error: (err) => {
        console.error('Failed to delete room:', err);
        this.saving.set(false);
      },
    });
  }

  // Remove Player
  confirmRemovePlayer(player: AdminRoomPlayer) {
    this.selectedPlayer.set(player);
    this.removePlayerReason = '';
    this.modalType.set('removePlayer');
  }

  doRemovePlayer() {
    if (!this.selectedRoom() || !this.selectedPlayer()) return;

    this.saving.set(true);
    this.roomService
      .removePlayer(
        this.selectedRoom()!.id,
        this.selectedPlayer()!.userId,
        this.removePlayerReason,
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          // Reload players
          this.loadRoomPlayers(this.selectedRoom()!.id);
          this.modalType.set('view');
          this.selectedPlayer.set(null);
        },
        error: (err) => {
          console.error('Failed to remove player:', err);
          this.saving.set(false);
        },
      });
  }

  closeModal() {
    this.modalType.set(null);
    this.selectedRoom.set(null);
    this.selectedPlayer.set(null);
    this.roomPlayers.set([]);
  }
}
