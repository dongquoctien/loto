import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  iconoirHome,
  iconoirMediaImage,
  iconoirGroup,
  iconoirLogOut,
  iconoirMenu,
  iconoirXmark,
  iconoirHomeAlt,
  iconoirSettings,
  iconoirStatsReport,
} from '@ng-icons/iconoir';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIcon],
  viewProviders: [
    provideIcons({
      iconoirHome,
      iconoirMediaImage,
      iconoirGroup,
      iconoirLogOut,
      iconoirMenu,
      iconoirXmark,
      iconoirHomeAlt,
      iconoirSettings,
      iconoirStatsReport,
    }),
  ],
  template: `
    <div class="admin-layout">
      <!-- Mobile Header -->
      <header class="mobile-header">
        <button class="menu-btn" (click)="sidebarOpen = !sidebarOpen">
          <ng-icon [name]="sidebarOpen ? 'iconoirXmark' : 'iconoirMenu'"></ng-icon>
        </button>
        <h1>Admin</h1>
      </header>

      <!-- Sidebar -->
      <aside class="sidebar" [class.open]="sidebarOpen">
        <div class="sidebar-header">
          <h2>Lô Tô Admin</h2>
        </div>
        <nav class="sidebar-nav">
          <a routerLink="/lobby" class="nav-item" (click)="sidebarOpen = false">
            <ng-icon name="iconoirHome"></ng-icon>
            <span>Về Lobby</span>
          </a>
          <div class="nav-divider"></div>
          <a routerLink="dashboard" routerLinkActive="active" class="nav-item" (click)="sidebarOpen = false">
            <ng-icon name="iconoirStatsReport"></ng-icon>
            <span>Dashboard</span>
          </a>
          <a routerLink="stickers" routerLinkActive="active" class="nav-item" (click)="sidebarOpen = false">
            <ng-icon name="iconoirMediaImage"></ng-icon>
            <span>Quản lý Sticker</span>
          </a>
          <a routerLink="users" routerLinkActive="active" class="nav-item" (click)="sidebarOpen = false">
            <ng-icon name="iconoirGroup"></ng-icon>
            <span>Quản lý User</span>
          </a>
          <a routerLink="rooms" routerLinkActive="active" class="nav-item" (click)="sidebarOpen = false">
            <ng-icon name="iconoirHomeAlt"></ng-icon>
            <span>Quản lý Phòng</span>
          </a>
          <div class="nav-divider"></div>
          <a routerLink="settings" routerLinkActive="active" class="nav-item" (click)="sidebarOpen = false">
            <ng-icon name="iconoirSettings"></ng-icon>
            <span>Cài đặt hệ thống</span>
          </a>
        </nav>
        <div class="sidebar-footer">
          <button class="logout-btn" (click)="logout()">
            <ng-icon name="iconoirLogOut"></ng-icon>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <!-- Backdrop for mobile -->
      @if (sidebarOpen) {
        <div class="backdrop" (click)="sidebarOpen = false"></div>
      }

      <!-- Main Content -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .admin-layout {
      min-height: 100vh;
      display: flex;
      background: #F0F2F5;
    }

    /* Mobile Header */
    .mobile-header {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 56px;
      background: #1877F2;
      color: white;
      padding: 0 16px;
      align-items: center;
      gap: 12px;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .mobile-header h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .menu-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: white;
      display: flex;
      flex-direction: column;
      box-shadow: 2px 0 4px rgba(0,0,0,0.05);
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 200;
    }

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid #E4E6EB;
    }

    .sidebar-header h2 {
      margin: 0;
      font-size: 20px;
      color: #1877F2;
      font-weight: 700;
    }

    .sidebar-nav {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      color: #1C1E21;
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.2s;
      margin-bottom: 4px;
    }

    .nav-item:hover {
      background: #F0F2F5;
    }

    .nav-item.active {
      background: #E7F3FF;
      color: #1877F2;
      font-weight: 600;
    }

    .nav-item ng-icon {
      font-size: 20px;
    }

    .nav-divider {
      height: 1px;
      background: #E4E6EB;
      margin: 12px 0;
    }

    .sidebar-footer {
      padding: 12px;
      border-top: 1px solid #E4E6EB;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      background: none;
      border: none;
      color: #65676B;
      cursor: pointer;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .logout-btn:hover {
      background: #FFEBE9;
      color: #FA383E;
    }

    .logout-btn ng-icon {
      font-size: 20px;
    }

    /* Main Content */
    .main-content {
      flex: 1;
      margin-left: 260px;
      padding: 24px;
      min-height: 100vh;
    }

    /* Backdrop */
    .backdrop {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 150;
    }

    /* Mobile styles */
    @media (max-width: 768px) {
      .mobile-header {
        display: flex;
      }

      .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }

      .sidebar.open {
        transform: translateX(0);
      }

      .backdrop {
        display: block;
      }

      .main-content {
        margin-left: 0;
        padding: 72px 16px 16px;
      }
    }
  `],
})
export class AdminComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  sidebarOpen = false;

  logout() {
    this.authService.logout();
  }
}
