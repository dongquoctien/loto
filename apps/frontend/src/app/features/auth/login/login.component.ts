import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Lô Tô Online</h1>
        <h2>Đăng Nhập</h2>

        @if (error()) {
          <div class="error-message">{{ error() }}</div>
        }

        <form (ngSubmit)="onLogin()">
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
            <label for="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              placeholder="Nhập mật khẩu"
            />
          </div>

          <button type="submit" [disabled]="loading()">
            {{ loading() ? 'Đang xử lý...' : 'Đăng Nhập' }}
          </button>
        </form>

        <p class="auth-link">
          Chưa có tài khoản? <a routerLink="/register">Đăng ký</a>
        </p>
      </div>
    </div>
  `,
  styleUrl: '../auth.styles.scss',
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onLogin() {
    this.loading.set(true);
    this.error.set('');

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/lobby']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Đăng nhập thất bại');
        this.loading.set(false);
      },
    });
  }
}
