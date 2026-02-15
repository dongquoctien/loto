import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  iconoirPlus,
  iconoirEdit,
  iconoirTrash,
  iconoirRefresh,
  iconoirXmark,
  iconoirLock,
  iconoirShieldCheck,
  iconoirUser,
  iconoirNavArrowLeft,
  iconoirNavArrowRight,
  iconoirProhibition,
  iconoirCheckCircle,
} from '@ng-icons/iconoir';
import { AdminUserService, AdminUser, CreateUserDto, UpdateUserDto, UserRole } from '../services/admin-user.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  viewProviders: [
    provideIcons({
      iconoirPlus,
      iconoirEdit,
      iconoirTrash,
      iconoirRefresh,
      iconoirXmark,
      iconoirLock,
      iconoirShieldCheck,
      iconoirUser,
      iconoirNavArrowLeft,
      iconoirNavArrowRight,
      iconoirProhibition,
      iconoirCheckCircle,
    }),
  ],
  template: `
    <div class="page-header">
      <h1>Quản lý User</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" (click)="loadUsers()">
          <ng-icon name="iconoirRefresh"></ng-icon>
          Làm mới
        </button>
        <button class="btn btn-primary" (click)="openCreateDialog()">
          <ng-icon name="iconoirPlus"></ng-icon>
          Thêm User
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ total() }}</div>
        <div class="stat-label">Tổng user</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ adminCount() }}</div>
        <div class="stat-label">Admin</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ bannedCount() }}</div>
        <div class="stat-label">Bị ban</div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          @for (user of users(); track user.id) {
            <tr [class.banned]="user.isBanned">
              <td>
                <div class="user-cell">
                  <div class="avatar">
                    @if (user.avatarUrl) {
                      <img [src]="user.avatarUrl" [alt]="user.displayName" />
                    } @else {
                      <span>{{ user.displayName?.charAt(0)?.toUpperCase() || '?' }}</span>
                    }
                  </div>
                  <div class="user-info">
                    <div class="display-name">{{ user.displayName }}</div>
                    <div class="username">&#64;{{ user.username }}</div>
                  </div>
                </div>
              </td>
              <td>{{ user.email }}</td>
              <td>
                <span class="role-badge" [class.admin]="user.role === 'admin'">
                  <ng-icon [name]="user.role === 'admin' ? 'iconoirShieldCheck' : 'iconoirUser'"></ng-icon>
                  {{ user.role === 'admin' ? 'Admin' : 'User' }}
                </span>
              </td>
              <td>
                @if (user.isBanned) {
                  <span class="status-badge banned">
                    <ng-icon name="iconoirProhibition"></ng-icon>
                    Bị ban
                  </span>
                } @else {
                  <span class="status-badge active">
                    <ng-icon name="iconoirCheckCircle"></ng-icon>
                    Hoạt động
                  </span>
                }
              </td>
              <td>{{ formatDate(user.createdAt) }}</td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn" (click)="openEditDialog(user)" title="Sửa">
                    <ng-icon name="iconoirEdit"></ng-icon>
                  </button>
                  <button class="action-btn" (click)="openPasswordDialog(user)" title="Đổi mật khẩu">
                    <ng-icon name="iconoirLock"></ng-icon>
                  </button>
                  <button
                    class="action-btn"
                    [class.danger]="!user.isBanned"
                    [class.success]="user.isBanned"
                    (click)="toggleBan(user)"
                    [title]="user.isBanned ? 'Bỏ ban' : 'Ban user'">
                    <ng-icon name="iconoirProhibition"></ng-icon>
                  </button>
                  <button class="action-btn danger" (click)="confirmDelete(user)" title="Xóa">
                    <ng-icon name="iconoirTrash"></ng-icon>
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="empty-cell">
                @if (loading()) {
                  Đang tải...
                } @else {
                  Chưa có user nào
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    @if (totalPages() > 1) {
      <div class="pagination">
        <button
          class="page-btn"
          [disabled]="currentPage() === 1"
          (click)="goToPage(currentPage() - 1)">
          <ng-icon name="iconoirNavArrowLeft"></ng-icon>
        </button>
        <span class="page-info">Trang {{ currentPage() }} / {{ totalPages() }}</span>
        <button
          class="page-btn"
          [disabled]="currentPage() >= totalPages()"
          (click)="goToPage(currentPage() + 1)">
          <ng-icon name="iconoirNavArrowRight"></ng-icon>
        </button>
      </div>
    }

    <!-- Create/Edit Dialog -->
    @if (showDialog()) {
      <div class="dialog-backdrop" (click)="closeDialog()"></div>
      <div class="dialog">
        <div class="dialog-header">
          <h2>{{ editingUser() ? 'Sửa User' : 'Thêm User Mới' }}</h2>
          <button class="close-btn" (click)="closeDialog()">
            <ng-icon name="iconoirXmark"></ng-icon>
          </button>
        </div>
        <form (ngSubmit)="saveUser()">
          <div class="form-group">
            <label>Username</label>
            <input
              [(ngModel)]="form.username"
              name="username"
              required
              placeholder="username"
              [disabled]="!!editingUser()" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input
              type="email"
              [(ngModel)]="form.email"
              name="email"
              required
              placeholder="email@example.com" />
          </div>
          @if (!editingUser()) {
            <div class="form-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                [(ngModel)]="form.password"
                name="password"
                required
                minlength="6"
                placeholder="Tối thiểu 6 ký tự" />
            </div>
          }
          <div class="form-group">
            <label>Tên hiển thị</label>
            <input
              [(ngModel)]="form.displayName"
              name="displayName"
              placeholder="Tên hiển thị" />
          </div>
          <div class="form-group">
            <label>Vai trò</label>
            <select [(ngModel)]="form.role" name="role">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" (click)="closeDialog()">Hủy</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? 'Đang lưu...' : 'Lưu' }}
            </button>
          </div>
        </form>
      </div>
    }

    <!-- Reset Password Dialog -->
    @if (passwordTarget()) {
      <div class="dialog-backdrop" (click)="passwordTarget.set(null)"></div>
      <div class="dialog dialog-sm">
        <div class="dialog-header">
          <h2>Đổi mật khẩu</h2>
          <button class="close-btn" (click)="passwordTarget.set(null)">
            <ng-icon name="iconoirXmark"></ng-icon>
          </button>
        </div>
        <form (ngSubmit)="resetPassword()">
          <div class="dialog-body">
            <p>Đổi mật khẩu cho user: <strong>{{ passwordTarget()?.username }}</strong></p>
            <div class="form-group">
              <label>Mật khẩu mới</label>
              <input
                type="password"
                [(ngModel)]="newPassword"
                name="newPassword"
                required
                minlength="6"
                placeholder="Tối thiểu 6 ký tự" />
            </div>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" (click)="passwordTarget.set(null)">Hủy</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || newPassword.length < 6">
              {{ saving() ? 'Đang lưu...' : 'Đổi mật khẩu' }}
            </button>
          </div>
        </form>
      </div>
    }

    <!-- Delete Confirmation Dialog -->
    @if (deleteTarget()) {
      <div class="dialog-backdrop" (click)="deleteTarget.set(null)"></div>
      <div class="dialog dialog-sm">
        <div class="dialog-header">
          <h2>Xác nhận xóa</h2>
        </div>
        <div class="dialog-body">
          <p>Bạn có chắc muốn xóa user "<strong>{{ deleteTarget()?.username }}</strong>"?</p>
          <p class="warning">Hành động này không thể hoàn tác. Tất cả dữ liệu của user sẽ bị xóa.</p>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" (click)="deleteTarget.set(null)">Hủy</button>
          <button class="btn btn-danger" (click)="deleteUser()" [disabled]="saving()">
            {{ saving() ? 'Đang xóa...' : 'Xóa' }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
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

    .header-actions {
      display: flex;
      gap: 12px;
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

    .btn-primary:hover {
      background: #166FE5;
    }

    .btn-secondary {
      background: #E4E6EB;
      color: #1C1E21;
    }

    .btn-secondary:hover {
      background: #D8DADF;
    }

    .btn-danger {
      background: #FA383E;
      color: white;
    }

    .btn-danger:hover {
      background: #E5383D;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Stats */
    .stats-row {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      flex: 1;
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #1877F2;
    }

    .stat-label {
      font-size: 14px;
      color: #65676B;
      margin-top: 4px;
    }

    /* Table */
    .table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
    }

    .users-table th {
      text-align: left;
      padding: 16px;
      background: #F7F8FA;
      font-weight: 600;
      color: #65676B;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .users-table td {
      padding: 16px;
      border-top: 1px solid #E4E6EB;
      vertical-align: middle;
    }

    .users-table tr.banned {
      background: #FFF5F5;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #E4E6EB;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #65676B;
      overflow: hidden;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .user-info .display-name {
      font-weight: 600;
      color: #1C1E21;
    }

    .user-info .username {
      font-size: 13px;
      color: #65676B;
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: #E4E6EB;
      border-radius: 16px;
      font-size: 13px;
      color: #65676B;
    }

    .role-badge.admin {
      background: #E7F3FF;
      color: #1877F2;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 13px;
    }

    .status-badge.active {
      background: #E8F5E9;
      color: #2E7D32;
    }

    .status-badge.banned {
      background: #FFEBE9;
      color: #FA383E;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      padding: 8px;
      background: none;
      border: 1px solid #E4E6EB;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #65676B;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: #F0F2F5;
      color: #1C1E21;
    }

    .action-btn.danger:hover {
      background: #FFEBE9;
      color: #FA383E;
      border-color: #FA383E;
    }

    .action-btn.success:hover {
      background: #E8F5E9;
      color: #2E7D32;
      border-color: #2E7D32;
    }

    .empty-cell {
      text-align: center;
      color: #65676B;
      padding: 48px !important;
    }

    /* Pagination */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 24px;
    }

    .page-btn {
      padding: 8px 12px;
      background: white;
      border: 1px solid #E4E6EB;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.2s;
    }

    .page-btn:hover:not(:disabled) {
      background: #F0F2F5;
      border-color: #1877F2;
    }

    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .page-info {
      font-size: 14px;
      color: #65676B;
    }

    /* Dialog */
    .dialog-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 300;
    }

    .dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      z-index: 301;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    }

    .dialog-sm {
      max-width: 400px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #E4E6EB;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 18px;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #65676B;
      display: flex;
    }

    .close-btn:hover {
      color: #1C1E21;
    }

    .dialog-body {
      padding: 20px;
    }

    .dialog-body p {
      margin: 0 0 12px;
    }

    .dialog-body .warning {
      color: #FA383E;
      font-size: 14px;
    }

    .dialog form {
      padding: 20px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
      font-weight: 500;
      color: #1C1E21;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #E4E6EB;
      border-radius: 8px;
      font-size: 14px;
      box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #1877F2;
      box-shadow: 0 0 0 2px rgba(24,119,242,0.2);
    }

    .form-group input:disabled {
      background: #F0F2F5;
      color: #65676B;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid #E4E6EB;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .stats-row {
        flex-direction: column;
      }

      .table-container {
        overflow-x: auto;
      }

      .users-table {
        min-width: 700px;
      }
    }
  `],
})
export class UserManagementComponent implements OnInit {
  private userService = inject(AdminUserService);

  users = signal<AdminUser[]>([]);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  loading = signal(false);
  saving = signal(false);
  showDialog = signal(false);
  editingUser = signal<AdminUser | null>(null);
  deleteTarget = signal<AdminUser | null>(null);
  passwordTarget = signal<AdminUser | null>(null);
  newPassword = '';

  form: CreateUserDto & { role: UserRole } = {
    username: '',
    email: '',
    password: '',
    displayName: '',
    role: 'user',
  };

  adminCount = computed(() => this.users().filter((u) => u.role === 'admin').length);
  bannedCount = computed(() => this.users().filter((u) => u.isBanned).length);

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.userService.getAll(this.currentPage(), 20).subscribe({
      next: (res) => {
        this.users.set(res.users);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadUsers();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  }

  openCreateDialog() {
    this.editingUser.set(null);
    this.form = {
      username: '',
      email: '',
      password: '',
      displayName: '',
      role: 'user',
    };
    this.showDialog.set(true);
  }

  openEditDialog(user: AdminUser) {
    this.editingUser.set(user);
    this.form = {
      username: user.username,
      email: user.email,
      password: '',
      displayName: user.displayName,
      role: user.role,
    };
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.editingUser.set(null);
  }

  saveUser() {
    if (!this.form.username || !this.form.email) return;

    this.saving.set(true);
    const editing = this.editingUser();

    if (editing) {
      const dto: UpdateUserDto = {
        email: this.form.email,
        displayName: this.form.displayName,
      };

      // Also change role if different
      const roleChanged = this.form.role !== editing.role;

      this.userService.update(editing.id, dto).subscribe({
        next: (updated) => {
          if (roleChanged) {
            this.userService.changeRole(editing.id, this.form.role).subscribe({
              next: (finalUser) => {
                this.users.update((list) =>
                  list.map((u) => (u.id === finalUser.id ? finalUser : u))
                );
                this.saving.set(false);
                this.closeDialog();
              },
            });
          } else {
            this.users.update((list) =>
              list.map((u) => (u.id === updated.id ? updated : u))
            );
            this.saving.set(false);
            this.closeDialog();
          }
        },
        error: () => {
          this.saving.set(false);
        },
      });
    } else {
      if (!this.form.password || this.form.password.length < 6) return;

      this.userService.create(this.form).subscribe({
        next: (created) => {
          this.users.update((list) => [created, ...list]);
          this.total.update((t) => t + 1);
          this.saving.set(false);
          this.closeDialog();
        },
        error: () => {
          this.saving.set(false);
        },
      });
    }
  }

  openPasswordDialog(user: AdminUser) {
    this.passwordTarget.set(user);
    this.newPassword = '';
  }

  resetPassword() {
    const target = this.passwordTarget();
    if (!target || this.newPassword.length < 6) return;

    this.saving.set(true);
    this.userService.resetPassword(target.id, this.newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.passwordTarget.set(null);
        this.newPassword = '';
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  toggleBan(user: AdminUser) {
    this.userService.setBanStatus(user.id, !user.isBanned).subscribe({
      next: (updated) => {
        this.users.update((list) =>
          list.map((u) => (u.id === updated.id ? updated : u))
        );
      },
    });
  }

  confirmDelete(user: AdminUser) {
    this.deleteTarget.set(user);
  }

  deleteUser() {
    const target = this.deleteTarget();
    if (!target) return;

    this.saving.set(true);
    this.userService.delete(target.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((u) => u.id !== target.id));
        this.total.update((t) => t - 1);
        this.saving.set(false);
        this.deleteTarget.set(null);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }
}
