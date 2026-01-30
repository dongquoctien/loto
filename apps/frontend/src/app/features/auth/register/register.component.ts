import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Lô Tô Online</h1>
        <h2>Đăng Ký</h2>

        @if (error()) {
          <div class="error-message">{{ error() }}</div>
        }

        <form (ngSubmit)="onRegister()">
          <div class="form-group">
            <label for="username">Tên đăng nhập</label>
            <input
              id="username"
              type="text"
              [(ngModel)]="username"
              name="username"
              required
              placeholder="Nhập tên đăng nhập"
            />
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="Nhập email"
            />
          </div>

          <div class="form-group">
            <label for="displayName">Tên hiển thị</label>
            <input
              id="displayName"
              type="text"
              [(ngModel)]="displayName"
              name="displayName"
              placeholder="Tên hiển thị trong game"
            />
          </div>

          <div class="form-group">
            <label for="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              placeholder="Tối thiểu 6 ký tự"
            />
          </div>

          <button type="submit" [disabled]="loading()">
            {{ loading() ? 'Đang xử lý...' : 'Đăng Ký' }}
          </button>
        </form>

        <p class="auth-link">
          Đã có tài khoản? <a routerLink="/login">Đăng nhập</a>
        </p>
      </div>
    </div>
  `,
  styleUrl: '../auth.styles.scss',
})
export class RegisterComponent {
  username = '';
  email = '';
  displayName = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onRegister() {
    this.loading.set(true);
    this.error.set('');

    this.authService
      .register(this.username, this.email, this.password, this.displayName || undefined)
      .subscribe({
        next: () => {
          this.router.navigate(['/lobby']);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Đăng ký thất bại');
          this.loading.set(false);
        },
      });
  }
}
