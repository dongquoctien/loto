import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  iconoirPlus,
  iconoirEdit,
  iconoirTrash,
  iconoirCheck,
  iconoirXmark,
  iconoirRefresh,
  iconoirEye,
  iconoirEyeClosed,
  iconoirFolder,
} from '@ng-icons/iconoir';
import {
  AdminStickerService,
  Sticker,
  StickerCategory,
  CreateStickerDto,
  UpdateStickerDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../services/admin-sticker.service';

@Component({
  selector: 'app-sticker-management',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  viewProviders: [
    provideIcons({
      iconoirPlus,
      iconoirEdit,
      iconoirTrash,
      iconoirCheck,
      iconoirXmark,
      iconoirRefresh,
      iconoirEye,
      iconoirEyeClosed,
      iconoirFolder,
    }),
  ],
  template: `
    <div class="page-header">
      <h1>Quản lý Sticker</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" (click)="loadData()">
          <ng-icon name="iconoirRefresh"></ng-icon>
          Làm mới
        </button>
        <button class="btn btn-secondary" (click)="showCategoryManager.set(true)">
          <ng-icon name="iconoirFolder"></ng-icon>
          Danh mục
        </button>
        <button class="btn btn-primary" (click)="openCreateDialog()">
          <ng-icon name="iconoirPlus"></ng-icon>
          Thêm Sticker
        </button>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="filter-tabs">
      <button
        class="filter-tab"
        [class.active]="filterCategoryId() === null"
        (click)="filterCategoryId.set(null)">
        Tất cả ({{ stickers().length }})
      </button>
      @for (cat of categories(); track cat.id) {
        <button
          class="filter-tab"
          [class.active]="filterCategoryId() === cat.id"
          (click)="filterCategoryId.set(cat.id)">
          {{ cat.icon }} {{ cat.name }} ({{ countByCategory(cat.id) }})
        </button>
      }
    </div>

    <!-- Sticker Grid -->
    <div class="sticker-grid">
      @for (sticker of filteredStickers(); track sticker.id) {
        <div class="sticker-card" [class.inactive]="!sticker.isActive">
          <div class="sticker-preview">
            <img [src]="sticker.url" [alt]="sticker.name" />
            @if (!sticker.isActive) {
              <div class="inactive-overlay">Ẩn</div>
            }
          </div>
          <div class="sticker-info">
            <div class="sticker-name">{{ sticker.name }}</div>
            <div class="sticker-meta">
              <span class="sticker-id">{{ sticker.stickerId }}</span>
              <span class="sticker-category">{{ sticker.category?.icon }} {{ sticker.category?.name }}</span>
            </div>
          </div>
          <div class="sticker-actions">
            <button
              class="action-btn"
              [class.active]="sticker.isActive"
              (click)="toggleActive(sticker)"
              [title]="sticker.isActive ? 'Ẩn sticker' : 'Hiện sticker'">
              <ng-icon [name]="sticker.isActive ? 'iconoirEye' : 'iconoirEyeClosed'"></ng-icon>
            </button>
            <button class="action-btn" (click)="openEditDialog(sticker)" title="Sửa">
              <ng-icon name="iconoirEdit"></ng-icon>
            </button>
            <button class="action-btn danger" (click)="confirmDelete(sticker)" title="Xóa">
              <ng-icon name="iconoirTrash"></ng-icon>
            </button>
          </div>
        </div>
      } @empty {
        <div class="empty-state">
          @if (loading()) {
            <p>Đang tải...</p>
          } @else {
            <p>Chưa có sticker nào</p>
          }
        </div>
      }
    </div>

    <!-- Create/Edit Dialog -->
    @if (showDialog()) {
      <div class="dialog-backdrop" (click)="closeDialog()"></div>
      <div class="dialog">
        <div class="dialog-header">
          <h2>{{ editingSticker() ? 'Sửa Sticker' : 'Thêm Sticker Mới' }}</h2>
          <button class="close-btn" (click)="closeDialog()">
            <ng-icon name="iconoirXmark"></ng-icon>
          </button>
        </div>
        <form (ngSubmit)="saveSticker()">
          <div class="form-group">
            <label>Sticker ID</label>
            <input
              [(ngModel)]="form.stickerId"
              name="stickerId"
              required
              placeholder="vd: sticker_smile_01"
              [disabled]="!!editingSticker()" />
          </div>
          <div class="form-group">
            <label>Tên sticker</label>
            <input
              [(ngModel)]="form.name"
              name="name"
              required
              placeholder="vd: Cười vui" />
          </div>
          <div class="form-group">
            <label>URL hình ảnh</label>
            <input
              [(ngModel)]="form.url"
              name="url"
              required
              placeholder="https://..." />
            @if (form.url) {
              <div class="preview-box">
                <img [src]="form.url" alt="Preview" />
              </div>
            }
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Danh mục</label>
              <select [(ngModel)]="form.categoryId" name="categoryId">
                @for (cat of categories(); track cat.id) {
                  <option [ngValue]="cat.id">{{ cat.icon }} {{ cat.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Thứ tự</label>
              <input
                type="number"
                [(ngModel)]="form.sortOrder"
                name="sortOrder"
                min="0" />
            </div>
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" [(ngModel)]="form.isActive" name="isActive" />
              Kích hoạt (hiển thị cho người dùng)
            </label>
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

    <!-- Delete Confirmation Dialog -->
    @if (deleteTarget()) {
      <div class="dialog-backdrop" (click)="deleteTarget.set(null)"></div>
      <div class="dialog dialog-sm">
        <div class="dialog-header">
          <h2>Xác nhận xóa</h2>
        </div>
        <div class="dialog-body">
          <p>Bạn có chắc muốn xóa sticker "<strong>{{ deleteTarget()?.name }}</strong>"?</p>
          <p class="warning">Hành động này không thể hoàn tác. Các tin nhắn cũ sử dụng sticker này sẽ hiển thị placeholder.</p>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" (click)="deleteTarget.set(null)">Hủy</button>
          <button class="btn btn-danger" (click)="deleteSticker()" [disabled]="saving()">
            {{ saving() ? 'Đang xóa...' : 'Xóa' }}
          </button>
        </div>
      </div>
    }

    <!-- Category Manager Dialog -->
    @if (showCategoryManager()) {
      <div class="dialog-backdrop" (click)="closeCategoryManager()"></div>
      <div class="dialog dialog-lg">
        <div class="dialog-header">
          <h2>Quản lý Danh mục</h2>
          <button class="close-btn" (click)="closeCategoryManager()">
            <ng-icon name="iconoirXmark"></ng-icon>
          </button>
        </div>
        <div class="dialog-body">
          <!-- Add new category form -->
          <div class="category-form">
            <input
              [(ngModel)]="categoryForm.icon"
              placeholder="Icon (emoji)"
              class="category-input icon-input" />
            <input
              [(ngModel)]="categoryForm.name"
              placeholder="Tên danh mục"
              class="category-input name-input" />
            <input
              [(ngModel)]="categoryForm.slug"
              placeholder="Slug (vd: working)"
              class="category-input slug-input" />
            <input
              type="number"
              [(ngModel)]="categoryForm.sortOrder"
              placeholder="Thứ tự"
              class="category-input order-input" />
            <button
              class="btn btn-primary"
              (click)="saveCategory()"
              [disabled]="savingCategory()">
              {{ editingCategory() ? 'Cập nhật' : 'Thêm' }}
            </button>
            @if (editingCategory()) {
              <button class="btn btn-secondary" (click)="cancelEditCategory()">Hủy</button>
            }
          </div>

          <!-- Category list -->
          <div class="category-list">
            @for (cat of categories(); track cat.id) {
              <div class="category-item" [class.inactive]="!cat.isActive">
                <span class="cat-icon">{{ cat.icon }}</span>
                <span class="cat-name">{{ cat.name }}</span>
                <span class="cat-slug">{{ cat.slug }}</span>
                <span class="cat-count">{{ countByCategory(cat.id) }} stickers</span>
                <div class="cat-actions">
                  <button
                    class="action-btn"
                    [class.active]="cat.isActive"
                    (click)="toggleCategoryActive(cat)"
                    [title]="cat.isActive ? 'Ẩn' : 'Hiện'">
                    <ng-icon [name]="cat.isActive ? 'iconoirEye' : 'iconoirEyeClosed'"></ng-icon>
                  </button>
                  <button class="action-btn" (click)="editCategory(cat)" title="Sửa">
                    <ng-icon name="iconoirEdit"></ng-icon>
                  </button>
                  <button
                    class="action-btn danger"
                    (click)="confirmDeleteCategory(cat)"
                    title="Xóa"
                    [disabled]="countByCategory(cat.id) > 0">
                    <ng-icon name="iconoirTrash"></ng-icon>
                  </button>
                </div>
              </div>
            } @empty {
              <div class="empty-state">Chưa có danh mục nào</div>
            }
          </div>
        </div>
      </div>
    }

    <!-- Delete Category Confirmation -->
    @if (deleteCategoryTarget()) {
      <div class="dialog-backdrop" (click)="deleteCategoryTarget.set(null)"></div>
      <div class="dialog dialog-sm">
        <div class="dialog-header">
          <h2>Xác nhận xóa danh mục</h2>
        </div>
        <div class="dialog-body">
          <p>Bạn có chắc muốn xóa danh mục "<strong>{{ deleteCategoryTarget()?.name }}</strong>"?</p>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" (click)="deleteCategoryTarget.set(null)">Hủy</button>
          <button class="btn btn-danger" (click)="deleteCategory()" [disabled]="savingCategory()">
            {{ savingCategory() ? 'Đang xóa...' : 'Xóa' }}
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

    /* Filter tabs */
    .filter-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .filter-tab {
      padding: 8px 16px;
      border: 1px solid #E4E6EB;
      background: white;
      border-radius: 20px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-tab:hover {
      border-color: #1877F2;
      color: #1877F2;
    }

    .filter-tab.active {
      background: #1877F2;
      color: white;
      border-color: #1877F2;
    }

    /* Sticker Grid */
    .sticker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .sticker-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .sticker-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .sticker-card.inactive {
      opacity: 0.6;
    }

    .sticker-preview {
      position: relative;
      aspect-ratio: 1;
      background: #F7F8FA;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .sticker-preview img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .inactive-overlay {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(0,0,0,0.6);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .sticker-info {
      padding: 12px;
      border-bottom: 1px solid #E4E6EB;
    }

    .sticker-name {
      font-weight: 600;
      color: #1C1E21;
      margin-bottom: 4px;
    }

    .sticker-meta {
      display: flex;
      gap: 8px;
      font-size: 12px;
      color: #65676B;
    }

    .sticker-id {
      font-family: monospace;
      background: #F0F2F5;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .sticker-category {
      text-transform: capitalize;
    }

    .sticker-actions {
      display: flex;
      padding: 8px;
      gap: 4px;
    }

    .action-btn {
      flex: 1;
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

    .action-btn.active {
      color: #31A24C;
    }

    .action-btn.danger:hover {
      background: #FFEBE9;
      color: #FA383E;
      border-color: #FA383E;
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 48px;
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

    .form-row {
      display: flex;
      gap: 16px;
    }

    .form-row .form-group {
      flex: 1;
    }

    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .checkbox-group input[type="checkbox"] {
      width: 18px;
      height: 18px;
    }

    .preview-box {
      margin-top: 12px;
      padding: 16px;
      background: #F7F8FA;
      border-radius: 8px;
      text-align: center;
    }

    .preview-box img {
      max-width: 100px;
      max-height: 100px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #E4E6EB;
      margin-top: 16px;
    }

    /* Category Manager */
    .dialog-lg {
      max-width: 700px;
    }

    .category-form {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .category-input {
      padding: 10px 12px;
      border: 1px solid #E4E6EB;
      border-radius: 8px;
      font-size: 14px;
    }

    .category-input:focus {
      outline: none;
      border-color: #1877F2;
    }

    .icon-input {
      width: 60px;
      text-align: center;
    }

    .name-input {
      flex: 2;
      min-width: 120px;
    }

    .slug-input {
      flex: 1;
      min-width: 100px;
    }

    .order-input {
      width: 70px;
    }

    .category-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .category-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #F7F8FA;
      border-radius: 8px;
    }

    .category-item.inactive {
      opacity: 0.6;
    }

    .cat-icon {
      font-size: 24px;
    }

    .cat-name {
      font-weight: 600;
      flex: 1;
    }

    .cat-slug {
      font-family: monospace;
      color: #65676B;
      background: #E4E6EB;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .cat-count {
      color: #65676B;
      font-size: 13px;
    }

    .cat-actions {
      display: flex;
      gap: 4px;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .sticker-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      }

      .form-row {
        flex-direction: column;
        gap: 0;
      }

      .category-form {
        flex-direction: column;
      }

      .category-input {
        width: 100%;
      }

      .category-item {
        flex-wrap: wrap;
      }
    }
  `],
})
export class StickerManagementComponent implements OnInit {
  private stickerService = inject(AdminStickerService);

  // Stickers
  stickers = signal<Sticker[]>([]);
  categories = signal<StickerCategory[]>([]);
  filterCategoryId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  showDialog = signal(false);
  editingSticker = signal<Sticker | null>(null);
  deleteTarget = signal<Sticker | null>(null);

  // Categories
  showCategoryManager = signal(false);
  editingCategory = signal<StickerCategory | null>(null);
  deleteCategoryTarget = signal<StickerCategory | null>(null);
  savingCategory = signal(false);

  form: CreateStickerDto & { isActive: boolean; sortOrder: number } = {
    stickerId: '',
    name: '',
    url: '',
    categoryId: 0,
    isActive: true,
    sortOrder: 0,
  };

  categoryForm: CreateCategoryDto = {
    slug: '',
    name: '',
    icon: '',
    sortOrder: 0,
  };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadCategories();
    this.loadStickers();
  }

  loadCategories() {
    this.stickerService.getAllCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        // Set default categoryId for form if not set
        if (!this.form.categoryId && categories.length > 0) {
          this.form.categoryId = categories[0].id;
        }
      },
    });
  }

  loadStickers() {
    this.loading.set(true);
    this.stickerService.getAll().subscribe({
      next: (stickers) => {
        this.stickers.set(stickers);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  filteredStickers() {
    const catId = this.filterCategoryId();
    if (catId === null) return this.stickers();
    return this.stickers().filter((s) => s.categoryId === catId);
  }

  countByCategory(categoryId: number) {
    return this.stickers().filter((s) => s.categoryId === categoryId).length;
  }

  openCreateDialog() {
    this.editingSticker.set(null);
    const firstCat = this.categories()[0];
    this.form = {
      stickerId: '',
      name: '',
      url: '',
      categoryId: firstCat?.id || 0,
      isActive: true,
      sortOrder: this.stickers().length,
    };
    this.showDialog.set(true);
  }

  openEditDialog(sticker: Sticker) {
    this.editingSticker.set(sticker);
    this.form = {
      stickerId: sticker.stickerId,
      name: sticker.name,
      url: sticker.url,
      categoryId: sticker.categoryId,
      isActive: sticker.isActive,
      sortOrder: sticker.sortOrder,
    };
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.editingSticker.set(null);
  }

  saveSticker() {
    if (!this.form.stickerId || !this.form.name || !this.form.url || !this.form.categoryId) return;

    this.saving.set(true);
    const editing = this.editingSticker();

    if (editing) {
      const dto: UpdateStickerDto = {
        name: this.form.name,
        url: this.form.url,
        categoryId: this.form.categoryId,
        isActive: this.form.isActive,
        sortOrder: this.form.sortOrder,
      };
      this.stickerService.update(editing.id, dto).subscribe({
        next: (updated) => {
          this.stickers.update((list) =>
            list.map((s) => (s.id === updated.id ? updated : s))
          );
          this.saving.set(false);
          this.closeDialog();
        },
        error: () => {
          this.saving.set(false);
        },
      });
    } else {
      this.stickerService.create(this.form).subscribe({
        next: (created) => {
          this.stickers.update((list) => [...list, created]);
          this.saving.set(false);
          this.closeDialog();
        },
        error: () => {
          this.saving.set(false);
        },
      });
    }
  }

  toggleActive(sticker: Sticker) {
    this.stickerService.toggleActive(sticker.id).subscribe({
      next: (updated) => {
        this.stickers.update((list) =>
          list.map((s) => (s.id === updated.id ? updated : s))
        );
      },
    });
  }

  confirmDelete(sticker: Sticker) {
    this.deleteTarget.set(sticker);
  }

  deleteSticker() {
    const target = this.deleteTarget();
    if (!target) return;

    this.saving.set(true);
    this.stickerService.delete(target.id).subscribe({
      next: () => {
        this.stickers.update((list) => list.filter((s) => s.id !== target.id));
        this.saving.set(false);
        this.deleteTarget.set(null);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  // ============ CATEGORY METHODS ============

  closeCategoryManager() {
    this.showCategoryManager.set(false);
    this.editingCategory.set(null);
    this.resetCategoryForm();
  }

  resetCategoryForm() {
    this.categoryForm = {
      slug: '',
      name: '',
      icon: '',
      sortOrder: this.categories().length,
    };
  }

  editCategory(cat: StickerCategory) {
    this.editingCategory.set(cat);
    this.categoryForm = {
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
    };
  }

  cancelEditCategory() {
    this.editingCategory.set(null);
    this.resetCategoryForm();
  }

  saveCategory() {
    if (!this.categoryForm.slug || !this.categoryForm.name || !this.categoryForm.icon) return;

    this.savingCategory.set(true);
    const editing = this.editingCategory();

    if (editing) {
      const dto: UpdateCategoryDto = {
        slug: this.categoryForm.slug,
        name: this.categoryForm.name,
        icon: this.categoryForm.icon,
        sortOrder: this.categoryForm.sortOrder,
      };
      this.stickerService.updateCategory(editing.id, dto).subscribe({
        next: (updated) => {
          this.categories.update((list) =>
            list.map((c) => (c.id === updated.id ? updated : c))
          );
          this.savingCategory.set(false);
          this.cancelEditCategory();
        },
        error: () => {
          this.savingCategory.set(false);
        },
      });
    } else {
      this.stickerService.createCategory(this.categoryForm).subscribe({
        next: (created) => {
          this.categories.update((list) => [...list, created]);
          this.savingCategory.set(false);
          this.resetCategoryForm();
        },
        error: () => {
          this.savingCategory.set(false);
        },
      });
    }
  }

  toggleCategoryActive(cat: StickerCategory) {
    this.stickerService.toggleCategoryActive(cat.id).subscribe({
      next: (updated) => {
        this.categories.update((list) =>
          list.map((c) => (c.id === updated.id ? updated : c))
        );
      },
    });
  }

  confirmDeleteCategory(cat: StickerCategory) {
    this.deleteCategoryTarget.set(cat);
  }

  deleteCategory() {
    const target = this.deleteCategoryTarget();
    if (!target) return;

    this.savingCategory.set(true);
    this.stickerService.deleteCategory(target.id).subscribe({
      next: () => {
        this.categories.update((list) => list.filter((c) => c.id !== target.id));
        this.savingCategory.set(false);
        this.deleteCategoryTarget.set(null);
      },
      error: () => {
        this.savingCategory.set(false);
      },
    });
  }
}
