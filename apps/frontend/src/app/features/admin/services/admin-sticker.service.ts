import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface StickerCategory {
  id: number;
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stickers?: Sticker[];
}

export interface Sticker {
  id: number;
  stickerId: string;
  name: string;
  url: string;
  categoryId: number;
  category?: StickerCategory;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStickerDto {
  stickerId: string;
  name: string;
  url: string;
  categoryId: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateStickerDto {
  stickerId?: string;
  name?: string;
  url?: string;
  categoryId?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateCategoryDto {
  slug: string;
  name: string;
  icon: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryDto {
  slug?: string;
  name?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminStickerService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/admin/stickers`;
  private categoryUrl = `${environment.apiUrl}/admin/sticker-categories`;

  // ============ STICKER METHODS ============

  getAll(): Observable<Sticker[]> {
    return this.http.get<Sticker[]>(this.baseUrl);
  }

  getById(id: number): Observable<Sticker> {
    return this.http.get<Sticker>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateStickerDto): Observable<Sticker> {
    return this.http.post<Sticker>(this.baseUrl, dto);
  }

  update(id: number, dto: UpdateStickerDto): Observable<Sticker> {
    return this.http.put<Sticker>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  toggleActive(id: number): Observable<Sticker> {
    return this.http.patch<Sticker>(`${this.baseUrl}/${id}/toggle`, {});
  }

  // ============ CATEGORY METHODS ============

  getAllCategories(): Observable<StickerCategory[]> {
    return this.http.get<StickerCategory[]>(this.categoryUrl);
  }

  getCategoryById(id: number): Observable<StickerCategory> {
    return this.http.get<StickerCategory>(`${this.categoryUrl}/${id}`);
  }

  createCategory(dto: CreateCategoryDto): Observable<StickerCategory> {
    return this.http.post<StickerCategory>(this.categoryUrl, dto);
  }

  updateCategory(id: number, dto: UpdateCategoryDto): Observable<StickerCategory> {
    return this.http.put<StickerCategory>(`${this.categoryUrl}/${id}`, dto);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.categoryUrl}/${id}`);
  }

  toggleCategoryActive(id: number): Observable<StickerCategory> {
    return this.http.patch<StickerCategory>(`${this.categoryUrl}/${id}/toggle`, {});
  }
}
