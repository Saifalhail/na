# Quick Start

## Run Both Backend and Frontend
```bash
./start.sh
```

## Or run them separately

### Run Backend Only
```bash
./start.sh backend
```

### Run Frontend Only (in another terminal)
```bash
./start.sh frontend
```

That's it!

## First Time Setup

1. Copy backend config:
   ```bash
   cd backend && cp .env.example .env
   ```

2. Edit `.env` with your database password and API keys

## Ports
- Backend: http://localhost:8000
- Frontend: Scan QR code with Expo Go app

## Windows Users
```cmd
wsl ./start.sh
```

Or separately:
```cmd
wsl ./start.sh backend
wsl ./start.sh frontend
```