import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  iconoirRefresh,
  iconoirGraphUp,
  iconoirUser,
  iconoirHomeAlt,
  iconoirWallet,
  iconoirTrophy,
  iconoirStatUp,
  iconoirNavArrowLeft,
  iconoirNavArrowRight,
} from '@ng-icons/iconoir';
import {
  AdminStatsService,
  OverallStats,
  PlayerStats,
  RoomStats,
} from '../services/admin-stats.service';

type TabType = 'overview' | 'players' | 'rooms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  viewProviders: [
    provideIcons({
      iconoirRefresh,
      iconoirGraphUp,
      iconoirUser,
      iconoirHomeAlt,
      iconoirWallet,
      iconoirTrophy,
      iconoirStatUp,
      iconoirNavArrowLeft,
      iconoirNavArrowRight,
    }),
  ],
  template: `
    <div class="dashboard-page">
      <header class="page-header">
        <h1>Dashboard Thống Kê</h1>
        <div class="header-actions">
          <select [(ngModel)]="selectedYear" (change)="onYearChange()">
            @for (year of availableYears(); track year) {
              <option [value]="year">{{ year }}</option>
            }
          </select>
          <button class="btn btn-secondary" (click)="loadData()">
            <ng-icon name="iconoirRefresh"></ng-icon>
            Làm mới
          </button>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab"
          [class.active]="activeTab() === 'overview'"
          (click)="activeTab.set('overview')"
        >
          <ng-icon name="iconoirGraphUp"></ng-icon>
          Tổng quan
        </button>
        <button
          class="tab"
          [class.active]="activeTab() === 'players'"
          (click)="activeTab.set('players')"
        >
          <ng-icon name="iconoirUser"></ng-icon>
          Theo người chơi
        </button>
        <button
          class="tab"
          [class.active]="activeTab() === 'rooms'"
          (click)="activeTab.set('rooms')"
        >
          <ng-icon name="iconoirHomeAlt"></ng-icon>
          Theo phòng
        </button>
      </div>

      @if (loading()) {
        <div class="loading">Đang tải dữ liệu...</div>
      } @else {
        <!-- Overview Tab -->
        @if (activeTab() === 'overview') {
          <div class="overview-section">
            <!-- Stats Cards -->
            <div class="stats-cards">
              <div class="stat-card revenue">
                <div class="stat-icon">
                  <ng-icon name="iconoirWallet"></ng-icon>
                </div>
                <div class="stat-content">
                  <h3>Tổng doanh thu</h3>
                  <p class="stat-value">{{ formatCurrency(overallStats()?.totalRevenue || 0) }}</p>
                </div>
              </div>

              <div class="stat-card games">
                <div class="stat-icon">
                  <ng-icon name="iconoirTrophy"></ng-icon>
                </div>
                <div class="stat-content">
                  <h3>Tổng ván chơi</h3>
                  <p class="stat-value">{{ overallStats()?.totalGames || 0 }}</p>
                </div>
              </div>

              <div class="stat-card rooms">
                <div class="stat-icon">
                  <ng-icon name="iconoirHomeAlt"></ng-icon>
                </div>
                <div class="stat-content">
                  <h3>Tổng phòng</h3>
                  <p class="stat-value">{{ overallStats()?.totalRooms || 0 }}</p>
                </div>
              </div>

              <div class="stat-card players">
                <div class="stat-icon">
                  <ng-icon name="iconoirUser"></ng-icon>
                </div>
                <div class="stat-content">
                  <h3>Người chơi</h3>
                  <p class="stat-value">{{ overallStats()?.totalPlayers || 0 }}</p>
                </div>
              </div>
            </div>

            <!-- Monthly Chart -->
            <div class="chart-section">
              <h2>Doanh thu theo tháng - {{ selectedYear }}</h2>
              <div class="chart-container">
                <div class="chart-bars">
                  @for (month of overallStats()?.monthlyStats || []; track month.month) {
                    <div class="chart-bar-wrapper">
                      <div
                        class="chart-bar"
                        [style.height.%]="getBarHeight(month.revenue)"
                        [title]="formatCurrency(month.revenue)"
                      >
                        <span class="bar-value">{{ formatShortCurrency(month.revenue) }}</span>
                      </div>
                      <span class="bar-label">T{{ month.month }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Top Lists -->
            <div class="top-lists">
              <div class="top-list">
                <h3>
                  <ng-icon name="iconoirTrophy"></ng-icon>
                  Top 5 người chơi
                </h3>
                <div class="list-items">
                  @for (player of topPlayers(); track player.userId; let i = $index) {
                    <div class="list-item">
                      <span class="rank">{{ i + 1 }}</span>
                      <div class="player-info">
                        <span class="name">{{ player.displayName || player.username }}</span>
                        <span class="sub">{{ player.gamesWon }} thắng / {{ player.gamesPlayed }} ván</span>
                      </div>
                      <span class="value" [class.positive]="player.netProfit > 0" [class.negative]="player.netProfit < 0">
                        {{ formatProfitShort(player.netProfit) }}
                      </span>
                    </div>
                  } @empty {
                    <div class="empty">Chưa có dữ liệu</div>
                  }
                </div>
              </div>

              <div class="top-list">
                <h3>
                  <ng-icon name="iconoirHomeAlt"></ng-icon>
                  Top 5 phòng
                </h3>
                <div class="list-items">
                  @for (room of topRooms(); track room.roomId; let i = $index) {
                    <div class="list-item">
                      <span class="rank">{{ i + 1 }}</span>
                      <div class="player-info">
                        <span class="name">{{ room.roomName }}</span>
                        <span class="sub">{{ room.totalGames }} ván</span>
                      </div>
                      <span class="value">{{ formatShortCurrency(room.totalRevenue) }}</span>
                    </div>
                  } @empty {
                    <div class="empty">Chưa có dữ liệu</div>
                  }
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Players Tab -->
        @if (activeTab() === 'players') {
          <div class="table-section">
            <div class="table-info">
              <span>Tổng: {{ playerTotal() }} người chơi</span>
            </div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Người chơi</th>
                    <th class="right">Ván chơi</th>
                    <th class="right">Thắng</th>
                    <th class="right">Tờ mua</th>
                    <th class="right">Tiền thắng</th>
                    <th class="right">Tiền thua</th>
                    <th class="right">Lãi/Lỗ</th>
                  </tr>
                </thead>
                <tbody>
                  @for (player of playerStats(); track player.userId; let i = $index) {
                    <tr>
                      <td>{{ playerOffset + i + 1 }}</td>
                      <td>
                        <div class="player-cell">
                          <div class="avatar">
                            @if (player.avatarUrl) {
                              <img [src]="player.avatarUrl" [alt]="player.displayName" />
                            } @else {
                              <span>{{ (player.displayName || player.username).charAt(0) }}</span>
                            }
                          </div>
                          <div class="info">
                            <span class="name">{{ player.displayName || player.username }}</span>
                            <span class="username">&#64;{{ player.username }}</span>
                          </div>
                        </div>
                      </td>
                      <td class="right">{{ player.gamesPlayed }}</td>
                      <td class="right">{{ player.gamesWon }}</td>
                      <td class="right">{{ player.sheetsPurchased }}</td>
                      <td class="right positive">+{{ formatCurrency(player.totalWinnings) }}</td>
                      <td class="right negative">-{{ formatCurrency(player.totalLosses) }}</td>
                      <td class="right" [class.positive]="player.netProfit > 0" [class.negative]="player.netProfit < 0">
                        {{ formatProfit(player.netProfit) }}
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="empty">Chưa có dữ liệu</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <!-- Pagination -->
            @if (playerTotal() > playerLimit) {
              <div class="pagination">
                <button
                  [disabled]="playerOffset === 0"
                  (click)="playerOffset = playerOffset - playerLimit; loadPlayerStats()"
                >
                  <ng-icon name="iconoirNavArrowLeft"></ng-icon>
                </button>
                <span>Trang {{ currentPlayerPage() }} / {{ totalPlayerPages() }}</span>
                <button
                  [disabled]="playerOffset + playerLimit >= playerTotal()"
                  (click)="playerOffset = playerOffset + playerLimit; loadPlayerStats()"
                >
                  <ng-icon name="iconoirNavArrowRight"></ng-icon>
                </button>
              </div>
            }
          </div>
        }

        <!-- Rooms Tab -->
        @if (activeTab() === 'rooms') {
          <div class="table-section">
            <div class="table-info">
              <span>Tổng: {{ roomTotal() }} phòng</span>
            </div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Phòng</th>
                    <th>Chủ phòng</th>
                    <th class="right">Giá/tờ</th>
                    <th class="right">Số ván</th>
                    <th class="right">Số tờ</th>
                    <th class="right">Doanh thu</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  @for (room of roomStats(); track room.roomId; let i = $index) {
                    <tr>
                      <td>{{ roomOffset + i + 1 }}</td>
                      <td>
                        <div class="room-cell">
                          <span class="room-name">{{ room.roomName }}</span>
                          <span class="room-code">{{ room.roomCode }}</span>
                        </div>
                      </td>
                      <td>{{ room.ownerName }}</td>
                      <td class="right">{{ formatCurrency(room.pricePerSheet) }}</td>
                      <td class="right">{{ room.totalGames }}</td>
                      <td class="right">{{ room.totalSheets }}</td>
                      <td class="right">{{ formatCurrency(room.totalRevenue) }}</td>
                      <td>
                        <span class="status-badge" [class]="room.status">
                          {{ getStatusText(room.status) }}
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="empty">Chưa có dữ liệu</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <!-- Pagination -->
            @if (roomTotal() > roomLimit) {
              <div class="pagination">
                <button
                  [disabled]="roomOffset === 0"
                  (click)="roomOffset = roomOffset - roomLimit; loadRoomStats()"
                >
                  <ng-icon name="iconoirNavArrowLeft"></ng-icon>
                </button>
                <span>Trang {{ currentRoomPage() }} / {{ totalRoomPages() }}</span>
                <button
                  [disabled]="roomOffset + roomLimit >= roomTotal()"
                  (click)="roomOffset = roomOffset + roomLimit; loadRoomStats()"
                >
                  <ng-icon name="iconoirNavArrowRight"></ng-icon>
                </button>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .page-header h1 {
      margin: 0;
      font-size: 24px;
      color: #1C1E21;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .header-actions select {
      padding: 10px 16px;
      border: 1px solid #E4E6EB;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
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

    .btn-secondary {
      background: #E4E6EB;
      color: #1C1E21;
    }

    .btn-secondary:hover {
      background: #D8DADF;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      border-bottom: 1px solid #E4E6EB;
      padding-bottom: 8px;
    }

    .tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: none;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #65676B;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab:hover {
      background: #F0F2F5;
    }

    .tab.active {
      background: #E7F3FF;
      color: #1877F2;
    }

    .loading {
      text-align: center;
      padding: 48px;
      color: #65676B;
    }

    /* Stats Cards */
    .stats-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      gap: 16px;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .stat-card.revenue .stat-icon {
      background: #E8F5E9;
      color: #2E7D32;
    }

    .stat-card.games .stat-icon {
      background: #FFF3E0;
      color: #EF6C00;
    }

    .stat-card.rooms .stat-icon {
      background: #E3F2FD;
      color: #1565C0;
    }

    .stat-card.players .stat-icon {
      background: #F3E5F5;
      color: #7B1FA2;
    }

    .stat-content h3 {
      margin: 0 0 4px;
      font-size: 13px;
      color: #65676B;
      font-weight: 500;
    }

    .stat-value {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1C1E21;
    }

    /* Chart */
    .chart-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .chart-section h2 {
      margin: 0 0 20px;
      font-size: 16px;
      color: #1C1E21;
    }

    .chart-container {
      height: 250px;
      display: flex;
      align-items: flex-end;
    }

    .chart-bars {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
      height: 100%;
      padding: 0 8px;
    }

    .chart-bar-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      max-width: 60px;
      height: 100%;
      justify-content: flex-end;
    }

    .chart-bar {
      width: 100%;
      max-width: 40px;
      background: linear-gradient(180deg, #1877F2 0%, #42A5F5 100%);
      border-radius: 6px 6px 0 0;
      min-height: 4px;
      position: relative;
      transition: height 0.3s ease;
    }

    .chart-bar:hover {
      background: linear-gradient(180deg, #1565C0 0%, #1877F2 100%);
    }

    .bar-value {
      position: absolute;
      top: -24px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: #65676B;
      white-space: nowrap;
    }

    .bar-label {
      margin-top: 8px;
      font-size: 12px;
      color: #65676B;
    }

    /* Top Lists */
    .top-lists {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .top-list {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .top-list h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px;
      font-size: 15px;
      color: #1C1E21;
    }

    .list-items {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .list-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #F0F2F5;
    }

    .list-item:last-child {
      border-bottom: none;
    }

    .rank {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #F0F2F5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      color: #65676B;
    }

    .list-item:nth-child(1) .rank { background: #FFD700; color: #1C1E21; }
    .list-item:nth-child(2) .rank { background: #C0C0C0; color: #1C1E21; }
    .list-item:nth-child(3) .rank { background: #CD7F32; color: white; }

    .player-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .player-info .name {
      font-weight: 500;
      color: #1C1E21;
    }

    .player-info .sub {
      font-size: 12px;
      color: #65676B;
    }

    .list-item .value {
      font-weight: 600;
      font-size: 14px;
    }

    .positive { color: #2E7D32; }
    .negative { color: #C62828; }

    .empty {
      text-align: center;
      padding: 24px;
      color: #65676B;
    }

    /* Table Section */
    .table-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .table-info {
      margin-bottom: 16px;
      color: #65676B;
      font-size: 14px;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #E4E6EB;
    }

    th {
      font-weight: 600;
      color: #65676B;
      font-size: 13px;
      background: #F7F8FA;
    }

    th.right, td.right {
      text-align: right;
    }

    .player-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .player-cell .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #E4E6EB;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .player-cell .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .player-cell .avatar span {
      font-weight: 600;
      color: #65676B;
    }

    .player-cell .info {
      display: flex;
      flex-direction: column;
    }

    .player-cell .name {
      font-weight: 500;
      color: #1C1E21;
    }

    .player-cell .username {
      font-size: 12px;
      color: #65676B;
    }

    .room-cell {
      display: flex;
      flex-direction: column;
    }

    .room-cell .room-name {
      font-weight: 500;
      color: #1C1E21;
    }

    .room-cell .room-code {
      font-size: 12px;
      color: #65676B;
      font-family: monospace;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-badge.waiting {
      background: #E3F2FD;
      color: #1565C0;
    }

    .status-badge.playing {
      background: #E8F5E9;
      color: #2E7D32;
    }

    .status-badge.closed {
      background: #FFEBEE;
      color: #C62828;
    }

    /* Pagination */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #E4E6EB;
    }

    .pagination button {
      width: 36px;
      height: 36px;
      border: 1px solid #E4E6EB;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pagination button:hover:not(:disabled) {
      background: #F0F2F5;
    }

    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pagination span {
      font-size: 14px;
      color: #65676B;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .tabs {
        overflow-x: auto;
        padding-bottom: 12px;
      }

      .tab {
        white-space: nowrap;
        padding: 10px 16px;
      }

      .stats-cards {
        grid-template-columns: repeat(2, 1fr);
      }

      .top-lists {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private statsService = inject(AdminStatsService);

  loading = signal(false);
  activeTab = signal<TabType>('overview');

  // Year filter
  selectedYear = new Date().getFullYear();
  availableYears = signal<number[]>([new Date().getFullYear()]);

  // Overall stats
  overallStats = signal<OverallStats | null>(null);
  topPlayers = signal<PlayerStats[]>([]);
  topRooms = signal<RoomStats[]>([]);

  // Player stats with pagination
  playerStats = signal<PlayerStats[]>([]);
  playerTotal = signal(0);
  playerOffset = 0;
  playerLimit = 20;

  // Room stats with pagination
  roomStats = signal<RoomStats[]>([]);
  roomTotal = signal(0);
  roomOffset = 0;
  roomLimit = 20;

  // Computed
  maxRevenue = computed(() => {
    const stats = this.overallStats();
    if (!stats?.monthlyStats) return 1;
    return Math.max(...stats.monthlyStats.map(m => m.revenue), 1);
  });

  currentPlayerPage = computed(() => Math.floor(this.playerOffset / this.playerLimit) + 1);
  totalPlayerPages = computed(() => Math.ceil(this.playerTotal() / this.playerLimit));

  currentRoomPage = computed(() => Math.floor(this.roomOffset / this.roomLimit) + 1);
  totalRoomPages = computed(() => Math.ceil(this.roomTotal() / this.roomLimit));

  ngOnInit() {
    this.loadAvailableYears();
    this.loadData();
  }

  loadAvailableYears() {
    this.statsService.getAvailableYears().subscribe({
      next: (years) => {
        if (years.length > 0) {
          this.availableYears.set(years);
          if (!years.includes(this.selectedYear)) {
            this.selectedYear = years[0];
          }
        }
      },
    });
  }

  onYearChange() {
    this.playerOffset = 0;
    this.roomOffset = 0;
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.loadOverallStats();
    this.loadTopPlayers();
    this.loadTopRooms();
    this.loadPlayerStats();
    this.loadRoomStats();
  }

  loadOverallStats() {
    this.statsService.getOverallStats(this.selectedYear).subscribe({
      next: (stats) => {
        this.overallStats.set(stats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadTopPlayers() {
    this.statsService.getTopPlayers(5, this.selectedYear).subscribe({
      next: (players) => this.topPlayers.set(players),
    });
  }

  loadTopRooms() {
    this.statsService.getTopRooms(5, this.selectedYear).subscribe({
      next: (rooms) => this.topRooms.set(rooms),
    });
  }

  loadPlayerStats() {
    this.statsService.getPlayerStats(this.selectedYear, this.playerLimit, this.playerOffset).subscribe({
      next: (res) => {
        this.playerStats.set(res.data);
        this.playerTotal.set(res.total);
      },
    });
  }

  loadRoomStats() {
    this.statsService.getRoomStats(this.selectedYear, this.roomLimit, this.roomOffset).subscribe({
      next: (res) => {
        this.roomStats.set(res.data);
        this.roomTotal.set(res.total);
      },
    });
  }

  getBarHeight(revenue: number): number {
    const max = this.maxRevenue();
    return max > 0 ? (revenue / max) * 100 : 0;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
  }

  formatShortCurrency(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(0) + 'K';
    }
    return value.toString();
  }

  formatProfit(value: number): string {
    const sign = value > 0 ? '+' : '';
    return sign + this.formatCurrency(value);
  }

  formatProfitShort(value: number): string {
    const sign = value > 0 ? '+' : '';
    return sign + this.formatShortCurrency(value);
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'waiting': return 'Chờ';
      case 'playing': return 'Đang chơi';
      case 'closed': return 'Đã đóng';
      default: return status;
    }
  }
}
