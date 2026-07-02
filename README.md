
```
╔══════════════════════════════════════════╗
║                                          ║
║          ╔╗ ╔╗ ╔═╗ ╔╦╗ ╔═╗ ╔═╗           ║
║          ║╚╦╝║  ║  ║║║ ╠═╣ ╚═╗           ║
║          ╩ ╩ ╩ ╚═╝ ═╩╝ ╩ ╩ ╚═╝           ║
║                                          ║
║                ▄▄██████▄▄                ║
║              ▄████▀▀▀▀████▄              ║
║             ████ █▀▄▄▀█ ████             ║
║             ████ █    █ ████             ║
║              ▀████▄▄▄▄████▀              ║
║                ▀▀██████▀▀                ║
║                                          ║
║   Self-hosted personal finance tracker   ║
║                                          ║
╚══════════════════════════════════════════╝
```

## Overview

Midas is a self-hosted, multi-tenant personal finance application. Create password-protected budget "binders" to track accounts, transactions, recurring bills, investments, and more — with full control over your data.

- **Stack**: TypeScript monorepo (Fastify + SQLite backend, React + Vite + Tailwind CSS frontend)
- **Storage**: SQLite via Drizzle ORM, local filesystem or MinIO/S3 for attachments
- **Sync**: Bidirectional data sync between self-hosted instances

---

## Docker Setup (Recommended)

**Prerequisites:** Docker and Docker Compose

```bash
git clone <repo-url>
cd midas

# Start all services (uses pre-built images from GitHub Container Registry)
docker compose up -d
```

Once running, the app is available at `http://localhost:5173`.

| Service | Port | Description |
|---|---|---|
| Frontend | `5173` | React web client (nginx) |
| API | `5001` | Fastify backend server |
| MinIO Console | `9001` | S3-compatible storage UI |

### Production environment variables

The `docker-compose.yml` configures the following variables for local production-like runs:

**Backend (`api`)**

| Variable | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Runtime mode |
| `PORT` | `5000` | API server port (internal) |
| `DATABASE_DIR` | `/data` | SQLite database directory |
| `STORAGE_MODE` | `s3` | File storage backend (`s3` or `local`) |
| `MINIO_ENDPOINT` | `minio` | MinIO server hostname |
| `MINIO_PORT` | `9000` | MinIO port |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `budget-files` | S3 bucket name |
| `MINIO_USE_SSL` | `false` | Whether to use SSL for MinIO |

**Frontend (`web`)**

| Variable | Value | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5001` | Backend API URL (from browser) |
| `NODE_ENV` | `production` | Runtime mode |

**MinIO**

| Variable | Value | Description |
|---|---|---|
| `MINIO_ROOT_USER` | `minioadmin` | MinIO admin username |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | MinIO admin password |

Edit these values in `docker-compose.yml` to match your environment. Set `STORAGE_MODE=local` to skip MinIO (files stored on disk instead). The `sqlite_data/` directory persists the database.

### Sample docker-compose.yml

Create a `docker-compose.yml` with the following content and run `docker compose up`:

```yaml
version: '3.8'

services:
  api:
    image: ghcr.io/germaniii-com/midas/backend
    platform: linux/amd64
    ports:
      - "5001:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - DATABASE_DIR=/data
      - STORAGE_MODE=local
    volumes:
      - /app/node_modules
      - ./sqlite_data:/data
    restart: always

  web:
    image: ghcr.io/germaniii-com/midas/frontend
    platform: linux/amd64
    ports:
      - "5173:80"
    environment:
      - VITE_API_URL=http://localhost:5001
      - NODE_ENV=production
    volumes:
      - /app/node_modules
    depends_on:
      - api
    restart: always
```

---

## Local Setup

**Prerequisites:** Node.js 20.19

### 1. Clone and install

```bash
git clone <repo-url>
cd midas
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` and set `STORAGE_MODE=local` and `DATABASE_DIR=.` to store file attachments and the SQLite database in the backend directory (no Docker required).

### 3. Run database migrations

```bash
npm run db:migrate --workspace=backend
```

Optionally seed sample data:

```bash
npm run db:seed --workspace=backend
```

### 5. Start development servers

In separate terminals:

```bash
npm run dev:backend   # API on http://localhost:5001
npm run dev:frontend  # UI on http://localhost:5173
```

---

## Desktop App

Midas can also run as a standalone desktop application via Electron, with the backend embedded as a child process.

**Prerequisites:** Node.js 20.19, npm workspaces enabled

### Development

> **`npm run dev:desktop`** — Start the app in development mode with hot reload

This single command:
1. Finds a free port so it never conflicts with other services
2. Starts the backend on that port
3. Launches an Electron window pointed at the Vite dev server
4. The window shows Chrome DevTools automatically

The backend database and file attachments are stored in `sqlite_data/` (dev) or `~/Library/Application Support/Midas/data/` (packaged).

### Production packaging

> **`npm run release:desktop`** — Full release build for your current platform

Runs the complete pipeline: clean install → build backend → build frontend → package with electron-builder.

| Command | Output |
|---------|--------|
| `npm run release:desktop` | Full release (calls `scripts/release-desktop.sh`) |
| `npm run package:desktop` | Unpacked `.app` for testing |
| `npm run package:desktop:dist` | Distributable installer (DMG/AppImage/NSIS) |
| `npm run package:mac` | macOS `.dmg` only |
| `npm run package:linux` | Linux `.AppImage` only |
| `npm run package:win` | Windows `.exe` only |

**How it works:** The main process spawns the backend as a child process on a random available port, passes the port via `additionalArguments` to the preload script, which exposes it through `contextBridge` to the renderer. The frontend reads `window.electronAPI.getApiUrl` to know where the API is — no hardcoded ports.

### CI / Release workflow

Push a version tag to trigger an automated cross-platform build on GitHub Actions:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This builds for macOS (`.dmg`) and Linux (`.AppImage`) and uploads the artifacts to GitHub Releases.

---

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_DIR` | `./sqlite_data` | SQLite database directory |
| `PORT` | `3000` | API server port |
| `STORAGE_MODE` | `s3` | `s3` or `local` |
| `MINIO_ENDPOINT` | `localhost` | MinIO hostname |
| `MINIO_PORT` | `9000` | MinIO port |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `midas-attachments` | S3 bucket name |
| `SERVER_PASSWORD` | _(empty)_ | Sync auth password |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5001` | Backend API URL |

---

## Project Structure

```
├── backend/          # Fastify API server
│   ├── src/
│   │   ├── db/       # Schema & database init
│   │   ├── routes/   # API route handlers
│   │   ├── services/ # Business logic
│   │   └── storage/  # File storage providers
│   └── Dockerfile
├── frontend/         # React web client
│   ├── src/
│   │   ├── api/      # Backend API calls
│   │   ├── hooks/    # React hooks (theme, preferences, sync)
│   │   ├── pages/    # Page components
│   │   └── components/ # Shared UI components
│   └── Dockerfile
├── desktop/          # Electron desktop app
│   ├── src/main/     # Main process (backend spawning, window mgmt)
│   ├── src/preload/  # Secure IPC bridge to renderer
│   ├── scripts/      # Build utilities (dependency copier)
│   └── electron.vite.config.ts
├── scripts/          # Release automation
└── docker-compose.yml
```
