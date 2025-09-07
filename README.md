# ModelScope API Monitor

A monitoring service for ModelScope API usage with web dashboard.

## Features

- Add multiple ModelScope accounts
- Monitor API rate limits and usage
- Real-time data updates
- Automatic data collection every 5 minutes
- Simple web dashboard

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install backend dependencies:
```bash
cd backend && npm install
```

3. Install frontend dependencies:
```bash
cd frontend && npm install
```

## Usage

### Development Mode

Run both backend and frontend:
```bash
npm run dev
```

Or run separately:

Backend (port 8000):
```bash
npm run dev:backend
```

Frontend (port 3000):
```bash
npm run dev:frontend
```

### Production Mode

Build and start:
```bash
npm run build
npm start
```

### Docker Deployment

#### Local Docker

1. Build the image:
```bash
docker build -t modelscope-monitor .
```

2. Run with docker-compose:
```bash
docker-compose up -d
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

#### GitHub Container Registry (GHCR)

The Docker image is automatically built and pushed to GHCR on every push to the main branch.

**Pull the image:**
```bash
docker pull ghcr.io/jswh/modelscope-monitor:latest
```

**Run with GHCR image:**
```bash
docker run -p 3000:3000 -p 8000:8000 -v $(pwd)/data:/app/backend/data ghcr.io/jswh/modelscope-monitor:latest
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/accounts` - Get all accounts
- `POST /api/accounts` - Add new account
- `PUT /api/accounts/:id` - Update account cookies
- `DELETE /api/accounts/:id` - Delete account
- `GET /api/accounts/:id/usage` - Get usage data
- `GET /api/accounts/:id/latest-usage` - Get latest usage data
- `POST /api/accounts/:id/refresh` - Refresh usage data

## Adding an Account

1. Go to [ModelScope Access Tokens](https://modelscope.cn/my/myaccesstoken)
2. Open browser developer tools and copy all cookies
3. In the web dashboard, click "Add Account"
4. Enter account name and paste the cookies
5. The system will validate the cookies and start monitoring

## Configuration

### Backend

- Port: 8000 (or set `PORT` environment variable)
- Data storage: SQLite database in `backend/data/monitor.db`
- Scheduled updates: Every 5 minutes

### Frontend

- Port: 3000
- Proxy to backend: `/api` -> `http://localhost:8000`

## Security Notes

- Cookies are stored in the database
- All API calls are authenticated with the provided cookies
- The system validates cookies before adding accounts
- Regular cookie updates are required as they expire

## License

MIT