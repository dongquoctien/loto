import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-cropper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cropper-overlay" (click)="cancel.emit()">
      <div class="cropper-modal" (click)="$event.stopPropagation()">
        <div class="cropper-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" (click)="cancel.emit()">&times;</button>
        </div>

        <div class="cropper-body">
          <div
            class="canvas-wrapper"
            #canvasWrapper
            (pointerdown)="onPointerDown($event)"
            (pointermove)="onPointerMove($event)"
            (pointerup)="onPointerUp()"
            (pointerleave)="onPointerUp()"
            (wheel)="onWheel($event)"
          >
            <canvas #cropCanvas></canvas>
            <div
              class="crop-frame"
              [class.circle]="shape === 'circle'"
              [style.width.px]="cropSize"
              [style.height.px]="cropSize"
            ></div>
          </div>

          <div class="zoom-controls">
            <button class="zoom-btn" (click)="zoomOut()">−</button>
            <input
              type="range"
              [min]="minScale * 100"
              [max]="maxScale * 100"
              [value]="scale * 100"
              (input)="onZoomSlider($event)"
              class="zoom-slider"
            />
            <button class="zoom-btn" (click)="zoomIn()">+</button>
          </div>
        </div>

        <div class="cropper-footer">
          <button class="btn-cancel" (click)="cancel.emit()">Hủy</button>
          <button class="btn-confirm" (click)="confirmCrop()">Xác Nhận</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cropper-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      animation: fadeIn 0.2s;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .cropper-modal {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 420px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 12px 28px rgba(0,0,0,0.3);
    }
    .cropper-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid #DDDFE2;
    }
    .cropper-header h3 { margin: 0; font-size: 17px; color: #1C1E21; }
    .close-btn {
      width: 32px; height: 32px; border-radius: 50%; border: none;
      background: #E4E6EB; color: #606770; font-size: 20px;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; line-height: 1;
    }
    .close-btn:hover { background: #D8DADF; }

    .cropper-body { padding: 16px; flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }

    .canvas-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      background: #1C1E21;
      border-radius: 8px;
      overflow: hidden;
      cursor: grab;
      touch-action: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .canvas-wrapper:active { cursor: grabbing; }

    canvas {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
    }

    .crop-frame {
      position: absolute;
      border: 2px solid white;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
      pointer-events: none;
      z-index: 1;
    }
    .crop-frame.circle { border-radius: 50%; }

    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 0 0;
    }
    .zoom-btn {
      width: 32px; height: 32px; border-radius: 50%;
      border: 1px solid #DDDFE2; background: white;
      font-size: 18px; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      color: #606770; line-height: 1;
    }
    .zoom-btn:hover { background: #F0F2F5; }
    .zoom-slider {
      flex: 1;
      height: 4px;
    }

    .cropper-footer {
      display: flex;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid #DDDFE2;
      justify-content: flex-end;
    }
    .btn-cancel {
      padding: 8px 20px; border: 1px solid #DDDFE2; background: white;
      border-radius: 6px; font-size: 14px; cursor: pointer; color: #606770;
      font-weight: 600;
    }
    .btn-cancel:hover { background: #F0F2F5; }
    .btn-confirm {
      padding: 8px 20px; border: none; background: #1877F2; color: white;
      border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 600;
    }
    .btn-confirm:hover { background: #166FE5; }

    @media (max-width: 768px) {
      .cropper-overlay { align-items: flex-end; }
      .cropper-modal {
        width: 100%;
        max-width: none;
        max-height: 92vh;
        border-radius: 16px 16px 0 0;
        animation: slideUpCropper 0.3s ease-out;
      }
      @keyframes slideUpCropper {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      .cropper-header {
        padding: 12px 16px;
        position: sticky;
        top: 0;
        background: white;
        z-index: 1;
        border-radius: 16px 16px 0 0;
      }
      .cropper-header::before {
        content: '';
        display: block;
        width: 36px;
        height: 4px;
        background: #D8DADF;
        border-radius: 2px;
        margin: 0 auto 8px;
      }
      .cropper-body { padding: 12px; }
      .cropper-footer {
        padding: 12px 16px;
        padding-bottom: max(12px, env(safe-area-inset-bottom));
      }
      .btn-cancel, .btn-confirm {
        flex: 1;
        padding: 12px;
        font-size: 15px;
      }
    }
  `],
})
export class ImageCropperComponent implements OnInit, OnDestroy {
  @ViewChild('cropCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasWrapper', { static: true }) wrapperRef!: ElementRef<HTMLDivElement>;

  /** The original image file to crop */
  @Input() imageFile!: File;
  /** 'circle' for avatar, 'square' for QR */
  @Input() shape: 'circle' | 'square' = 'circle';
  /** Title displayed in the header */
  @Input() title = 'Cắt ảnh';
  /** Output size in pixels (width = height) */
  @Input() outputSize = 400;

  @Output() cropped = new EventEmitter<File>();
  @Output() cancel = new EventEmitter<void>();

  cropSize = 240;
  scale = 1;
  minScale = 0.5;
  maxScale = 3;

  private img = new Image();
  private ctx: CanvasRenderingContext2D | null = null;
  private canvasSize = 300;

  // Image position (center-based offset from canvas center)
  private offsetX = 0;
  private offsetY = 0;

  // Drag state
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  private resizeObserver: ResizeObserver | null = null;

  ngOnInit() {
    const url = URL.createObjectURL(this.imageFile);
    this.img.onload = () => {
      URL.revokeObjectURL(url);
      this.setupCanvas();
      this.fitImage();
      this.draw();
    };
    this.img.src = url;

    // Observe wrapper resize to keep canvas crisp
    this.resizeObserver = new ResizeObserver(() => {
      this.setupCanvas();
      this.draw();
    });
    this.resizeObserver.observe(this.wrapperRef.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  private setupCanvas() {
    const wrapper = this.wrapperRef.nativeElement;
    const rect = wrapper.getBoundingClientRect();
    this.canvasSize = Math.floor(rect.width);
    this.cropSize = Math.floor(this.canvasSize * 0.75);

    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = this.canvasSize * dpr;
    canvas.height = this.canvasSize * dpr;
    this.ctx = canvas.getContext('2d');
    this.ctx?.scale(dpr, dpr);
  }

  private fitImage() {
    if (!this.img.naturalWidth) return;
    // Scale so the shorter side fills the crop area
    const shorter = Math.min(this.img.naturalWidth, this.img.naturalHeight);
    this.scale = this.cropSize / shorter;
    this.minScale = this.scale * 0.5;
    this.maxScale = this.scale * 4;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  private draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const s = this.canvasSize;
    ctx.clearRect(0, 0, s, s);

    // Draw the image centered with offset and scale
    const w = this.img.naturalWidth * this.scale;
    const h = this.img.naturalHeight * this.scale;
    const x = (s - w) / 2 + this.offsetX;
    const y = (s - h) / 2 + this.offsetY;
    ctx.drawImage(this.img, x, y, w, h);
  }

  // --- Interaction handlers ---

  onPointerDown(e: PointerEvent) {
    this.dragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragOffsetX = this.offsetX;
    this.dragOffsetY = this.offsetY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  onPointerMove(e: PointerEvent) {
    if (!this.dragging) return;
    this.offsetX = this.dragOffsetX + (e.clientX - this.dragStartX);
    this.offsetY = this.dragOffsetY + (e.clientY - this.dragStartY);
    this.draw();
  }

  onPointerUp() {
    this.dragging = false;
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale + delta));
    this.draw();
  }

  zoomIn() {
    this.scale = Math.min(this.maxScale, this.scale * 1.15);
    this.draw();
  }

  zoomOut() {
    this.scale = Math.max(this.minScale, this.scale / 1.15);
    this.draw();
  }

  onZoomSlider(e: Event) {
    this.scale = +(e.target as HTMLInputElement).value / 100;
    this.draw();
  }

  confirmCrop() {
    // Create an off-screen canvas at the output size
    const out = document.createElement('canvas');
    out.width = this.outputSize;
    out.height = this.outputSize;
    const outCtx = out.getContext('2d');
    if (!outCtx) return;

    // Calculate source rect in the displayed canvas coordinates
    const cropLeft = (this.canvasSize - this.cropSize) / 2;
    const cropTop = (this.canvasSize - this.cropSize) / 2;

    // Image position on the displayed canvas
    const w = this.img.naturalWidth * this.scale;
    const h = this.img.naturalHeight * this.scale;
    const imgX = (this.canvasSize - w) / 2 + this.offsetX;
    const imgY = (this.canvasSize - h) / 2 + this.offsetY;

    // Source rect in image coordinates
    const sx = (cropLeft - imgX) / this.scale;
    const sy = (cropTop - imgY) / this.scale;
    const sw = this.cropSize / this.scale;
    const sh = this.cropSize / this.scale;

    outCtx.drawImage(this.img, sx, sy, sw, sh, 0, 0, this.outputSize, this.outputSize);

    out.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], this.imageFile.name.replace(/\.[^.]+$/, '.jpg'), {
          type: 'image/jpeg',
        });
        this.cropped.emit(file);
      },
      'image/jpeg',
      0.9,
    );
  }
}
