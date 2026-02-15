import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, shareReplay, map, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StickerCategory {
  id: number;
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
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
}

export const PLACEHOLDER_STICKER: Sticker = {
  id: 0,
  stickerId: 'placeholder',
  name: 'Không khả dụng',
  url: '/assets/sticker-unavailable.jpg',
  categoryId: 0,
  isActive: false,
  sortOrder: 0,
};

@Injectable({ providedIn: 'root' })
export class StickerService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/stickers`;

  private stickersCache = signal<Sticker[]>([]);
  private cacheLoaded = signal(false);
  private stickersRequest$: Observable<Sticker[]> | null = null;

  readonly stickers = computed(() => this.stickersCache());
  readonly isLoaded = computed(() => this.cacheLoaded());

  /**
   * Get active stickers from API with caching
   */
  getActiveStickers(): Observable<Sticker[]> {
    // Return cached data if available
    if (this.cacheLoaded()) {
      return of(this.stickersCache());
    }

    // Return existing request if in progress
    if (this.stickersRequest$) {
      return this.stickersRequest$;
    }

    // Make new request and cache it
    this.stickersRequest$ = this.http.get<Sticker[]>(this.baseUrl).pipe(
      tap((stickers) => {
        this.stickersCache.set(stickers);
        this.cacheLoaded.set(true);
        this.stickersRequest$ = null;
      }),
      catchError((error) => {
        console.error('Failed to load stickers:', error);
        this.stickersRequest$ = null;
        return of([]);
      }),
      shareReplay(1)
    );

    return this.stickersRequest$;
  }

  /**
   * Get sticker by ID from cache
   * Returns placeholder if not found
   */
  getStickerById(stickerId: string): Sticker {
    const sticker = this.stickersCache().find((s) => s.stickerId === stickerId);
    return sticker || PLACEHOLDER_STICKER;
  }

  /**
   * Get sticker by ID - async version that ensures cache is loaded
   */
  getStickerByIdAsync(stickerId: string): Observable<Sticker> {
    return this.getActiveStickers().pipe(
      map((stickers) => {
        const sticker = stickers.find((s) => s.stickerId === stickerId);
        return sticker || PLACEHOLDER_STICKER;
      })
    );
  }

  /**
   * Get stickers by category ID
   */
  getStickersByCategoryId(categoryId: number): Sticker[] {
    return this.stickersCache().filter((s) => s.categoryId === categoryId);
  }

  /**
   * Get stickers by category slug
   */
  getStickersByCategorySlug(slug: string): Sticker[] {
    return this.stickersCache().filter((s) => s.category?.slug === slug);
  }

  /**
   * Get unique categories from loaded stickers
   */
  getCategories(): StickerCategory[] {
    const stickers = this.stickersCache();
    const categoryMap = new Map<number, StickerCategory>();
    for (const sticker of stickers) {
      if (sticker.category && !categoryMap.has(sticker.category.id)) {
        categoryMap.set(sticker.category.id, sticker.category);
      }
    }
    return Array.from(categoryMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Clear cache (useful for admin operations)
   */
  clearCache(): void {
    this.stickersCache.set([]);
    this.cacheLoaded.set(false);
    this.stickersRequest$ = null;
  }

  /**
   * Refresh stickers from API
   */
  refreshStickers(): Observable<Sticker[]> {
    this.clearCache();
    return this.getActiveStickers();
  }
}
