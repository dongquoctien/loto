# Loto - Game Lô Tô Online Vietnam

Multiplayer Vietnamese lottery (Lô Tô) game with real-time gameplay via WebSockets.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 21, Socket.io Client, SCSS |
| Backend | NestJS 11, TypeORM, Socket.io, Passport JWT |
| Database | MySQL 8.0 |
| Infrastructure | Docker, Nginx |

## Project Structure

```
loto/
├── apps/
│   ├── backend/       # NestJS REST API + WebSocket server
│   └── frontend/      # Angular SPA
├── packages/
│   └── shared/        # Shared types, constants, game utilities
├── docker/
│   ├── mysql/         # MySQL init scripts
│   └── nginx/         # Nginx reverse proxy config
└── docs/              # Reference images (ticket sheets)
```

## Prerequisites

- Node.js >= 20
- MySQL 8.0 (or use Docker)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USERNAME` | `loto_user` | MySQL username |
| `DB_PASSWORD` | `loto_password` | MySQL password |
| `DB_DATABASE` | `loto_db` | Database name |
| `DB_ROOT_PASSWORD` | `root_password` | MySQL root password (Docker only) |
| `JWT_SECRET` | — | Secret key for JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiration |
| `BACKEND_PORT` | `3000` | Backend server port |
| `FRONTEND_PORT` | `4200` | Frontend dev server port |
| `UPLOAD_MAX_SIZE` | `5242880` | Max upload size in bytes (5MB) |
| `UPLOAD_DIR` | `./uploads` | Upload directory path |

### 3. Build shared package

The shared package must be built before running backend or frontend:

```bash
npm run build:shared
```

### 4. Seed database

```bash
npm run seed
```

### 5. Start development servers

```bash
# Terminal 1 - Backend (port 3000)
npm run dev:backend

# Terminal 2 - Frontend (port 4200)
npm run dev:frontend
```

Open http://localhost:4200 in your browser.

## Docker Deployment

Run the full stack (MySQL + Backend + Frontend) with Docker Compose:

```bash
docker compose up -d
```

This starts:
- **MySQL** on port 3306
- **Backend** (NestJS) on port 3000
- **Frontend** (Nginx) on port 80 — proxies `/api/` and `/socket.io/` to backend

Open http://localhost to access the application.

To stop:

```bash
docker compose down
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build:shared` | Build shared package (required first) |
| `npm run build:backend` | Build backend for production |
| `npm run build:frontend` | Build frontend for production |
| `npm run dev:backend` | Start backend with hot-reload |
| `npm run dev:frontend` | Start Angular dev server |
| `npm run seed` | Seed database with ticket data |
| `npm run start:backend` | Run production backend |
| `npm run start:frontend` | Run production frontend (SSR) |

## Testing

```bash
# Backend (Jest)
cd apps/backend && npm test

# Frontend (Vitest)
cd apps/frontend && npm test
```

## Linting

```bash
cd apps/backend && npm run lint
```

---

## 🇻🇳 Chính sách sử dụng (Vietnamese)

### Mục đích

Dự án này được phát triển chỉ nhằm mục đích giải trí và học tập.

### Không kinh doanh – Không tiền bạc

- Không có bất kỳ hình thức kinh doanh, thu phí, cá cược hay giao dịch tiền bạc nào.
- Dự án không tạo ra lợi nhuận trực tiếp hoặc gián tiếp.

### Tuân thủ pháp luật

- Dự án không khuyến khích, không hỗ trợ và không liên quan đến các hoạt động vi phạm pháp luật.
- Người dùng chịu trách nhiệm cho việc sử dụng phần mềm theo quy định pháp luật tại quốc gia của mình.

### Trách nhiệm

- Tác giả không chịu trách nhiệm cho việc sử dụng sai mục đích hoặc trái pháp luật từ phía người dùng.
- Mọi nội dung trong dự án được cung cấp "as-is" (nguyên trạng).

### Liên hệ

Nếu có bất kỳ vấn đề nào liên quan đến bản quyền, pháp lý hoặc nội dung, vui lòng liên hệ trực tiếp với tác giả để được xử lý kịp thời:

📧 **itdongquoctien@gmail.com**

---

## 🇬🇧 Usage Policy (English)

### Purpose

This project is developed for **entertainment and educational purposes only**.

### No Commercial Use – No Money Involved

- There is no commercial activity, no fees, no gambling, and no monetary transactions involved.
- The project does not generate any direct or indirect profit.

### Legal Compliance

- The project does not promote, support, or engage in any illegal activities.
- Users are responsible for ensuring their use of the software complies with local laws and regulations.

### Disclaimer

- The author is not responsible for any misuse or illegal use of the project by users.
- All content is provided "as is", without warranties of any kind.

### Contact

If you believe there is any legal, copyright, or content-related issue, please contact the author directly for prompt resolution:

📧 **itdongquoctien@gmail.com**