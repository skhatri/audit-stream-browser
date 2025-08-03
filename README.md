# Paydash - Payment Processing Dashboard

A real-time dashboard for monitoring payment processing queue status built with TypeScript, React, Express.js, and Redis.

## Architecture

This is a full-stack TypeScript application with the following structure:

```
paydash/
├── src/                    # Backend API (Express.js)
│   ├── models/            # Data models and types
│   ├── services/          # Business logic (Redis, Scheduler)
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   └── utils/             # Utilities and logging
├── client/                # Frontend React app
│   └── src/
│       ├── components/    # React components
│       ├── hooks/         # Custom React hooks
│       ├── services/      # API client
│       ├── types/         # TypeScript types
│       └── styles/        # CSS styles
└── dist/                  # Built application
```

**Key Features:**
- Single process architecture - backend serves both API and frontend
- Real-time queue processing simulation
- Modern React UI with Tailwind CSS and teal theme
- TypeScript throughout for type safety
- Redis-backed queue management
- Automated queue object lifecycle simulation

## Queue Object Lifecycle

Queue objects progress through the following statuses:
- `RECEIVED` → `VALIDATING` → (`INVALID` | `ENRICHING`) → `PROCESSING` → `COMPLETE`
- Terminal states (`INVALID`, `COMPLETE`) have outcomes: `SUCCESS` or `FAILURE`

## Development Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- npm

### Quick Start

1. **Clone and setup:**
   ```bash
   git clone <repo>
   cd paydash
   chmod +x dev.sh
   ```

2. **Start development environment:**
   ```bash
   ./dev.sh
   ```
   This will:
   - Install all dependencies (root + client)
   - Start Redis in Docker
   - Start concurrent dev servers (API + frontend)

3. **Access the application:**
   - **Main App**: http://localhost:3001
   - **API**: http://localhost:3001/api
   - **Dev Server** (hot reload): http://localhost:5173

### Manual Development

If you prefer manual control:

```bash
# Install dependencies
npm run install:all

# Start Redis
docker-compose up -d redis

# Start development servers (in separate terminals)
npm run dev:server  # Backend on :3001
npm run dev:client  # Frontend on :5173
```

## Production Deployment

### Docker Compose (Full Stack)
```bash
docker-compose up --build
```

### Manual Build
```bash
npm run build    # Builds both client and server
npm start        # Runs production server
```

## API Endpoints

- `GET /api/queue` - Get queue objects (optional `?limit=N`)
- `GET /api/queue/stats` - Get queue statistics  
- `DELETE /api/queue/clear` - Clear all queue data
- `GET /health` - Health check

## Automated Simulation

The scheduler service automatically:
- **Every minute**: Inserts a new queue object with 1-10 records
- **Every 10 seconds**: Updates random non-terminal objects through status progression

## Testing

```bash
# Run all tests
npm test

# Run with coverage (80% threshold)
npm run test:coverage

# Backend tests only
npm run test:server

# Frontend tests only  
npm run test:client
```

## Environment Variables

```bash
PORT=3001                    # Server port
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

## Browser Testing

The application includes Playwright MCP integration for browser testing and validation.

## Project Structure Details

### Backend (`/src`)
- **Express.js** server with TypeScript
- **Redis** queue management via RedisService
- **Cron-based** scheduler for data simulation
- **RESTful API** with proper error handling
- **Static file serving** for built frontend

### Frontend (`/client/src`)  
- **React 18** with TypeScript
- **TanStack Query** for data fetching
- **Tailwind CSS** with custom teal theme
- **Heroicons** for consistent iconography
- **Date-fns** for date formatting

### Key Design Decisions
1. **Single Process**: Backend serves both API and static frontend for simplified deployment
2. **TypeScript First**: Shared types between frontend/backend, compile-time safety
3. **Real-time Updates**: Polling-based updates (SSE planned for future)
4. **Modern UI**: Clean, professional dashboard with loading states and error handling
5. **Docker Ready**: Full containerization with multi-stage builds