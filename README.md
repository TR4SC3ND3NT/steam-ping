# 🎮 CS2 Server Latency Checker v3.0

**Honest ping checker** for Counter-Strike 2 matchmaking servers. No fake values - only real measurements.

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![WebSocket](https://img.shields.io/badge/WebSocket-RTT-blue)

---

## 🐳 Docker Deployment (Recommended)

### Quick Start

```bash
# Clone and run
git clone <your-repo>
cd cs2-ping-checker

# Build and start
docker compose up --build -d

# Check status
docker compose ps
docker compose logs -f
```

Open **http://localhost** (port 80)

### Docker Architecture

```
┌─────────────────────────────────────────┐
│           docker-compose.yml            │
├─────────────────────────────────────────┤
│  frontend (nginx:alpine)                │
│  └── :80 → serves React SPA             │
│  └── /api/* → proxy to backend          │
│  └── /ws → WebSocket proxy              │
│                                         │
│  backend (node:20-alpine)               │
│  └── :3001 → Express API                │
│  └── ICMP/UDP ping (NET_RAW cap)        │
└─────────────────────────────────────────┘
```

### Stop & Clean

```bash
docker compose down
docker compose down -v --rmi all  # full cleanup
```

---

## 🚀 Deploy to Cloud Platforms

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Add environment variables in Railway dashboard:
- `PORT=3001`
- `NODE_ENV=production`

### Render

1. Create **Web Service** for backend:
   - Root Directory: `backend`
   - Build: `npm install`
   - Start: `node server.js`

2. Create **Static Site** for frontend:
   - Root Directory: `frontend`
   - Build: `npm run build`
   - Publish: `dist`

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy backend
cd backend
fly launch --name cs2-ping-backend
fly deploy

# Deploy frontend
cd ../frontend
fly launch --name cs2-ping-frontend
fly deploy
```

### VPS (Ubuntu/Debian)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone and deploy
git clone <your-repo> /opt/cs2-ping
cd /opt/cs2-ping
docker compose up -d

# Setup nginx reverse proxy (optional, for domain)
sudo apt install nginx certbot python3-certbot-nginx
# Configure /etc/nginx/sites-available/cs2-ping
```

---

## ⚠️ Limitations & Accuracy

### Important: Browser Cannot Do ICMP/UDP

**Browsers cannot perform true ICMP or UDP probes.** This is a fundamental limitation of web security. Any website claiming to ping servers from your browser is either:
1. Measuring something else (HTTP RTT, WebSocket RTT)
2. Running probes from their server (not your location)
3. Making up numbers

### What This Tool Does

| Mode | What It Measures | Accuracy |
|------|------------------|----------|
| **Local Mode** | Real ICMP/UDP from this machine | ✅ Accurate for this host |
| **Client Mode** | WebSocket RTT to backend server | ⚡ Estimate only |

### Result Categories

| Status | Meaning |
|--------|---------|
| **Measured (ICMP/UDP)** | Real probe response received with actual latency |
| **Blocked** | Known Valve IP, but blocks probes. **We do NOT invent a number.** Shows `—` |
| **Offline** | Not a known Valve IP and no response |

### Latency Thresholds

| Status | Range | Color |
|--------|-------|-------|
| 🟢 Excellent | 0-40 ms | Green |
| 🟡 Good | 41-80 ms | Yellow |
| 🔴 Poor | > 80 ms | Red |
| 🟣 Blocked | No data | Purple |
| ⚫ Offline | Unreachable | Gray |

---

## 🏗️ Architecture

```
/project
├── /backend
│   ├── server.js      # Express + WebSocket + ICMP/UDP probes
│   └── package.json
│
├── /frontend
│   ├── src/
│   │   ├── App.jsx         # Main component with mode detection
│   │   ├── ServerList.jsx  # Server cards with filters
│   │   ├── main.jsx
│   │   └── index.css       # Styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## 💻 Local Development

### Install & Run (without Docker)

```bash
# Terminal 1 - Backend
cd backend
npm install
node server.js
# API running at http://localhost:3001

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
# UI running at http://localhost:5173
```

Open **http://localhost:5173**

### Backend Output

```
╔═══════════════════════════════════════════════════╗
║     🎮 CS2 PING CHECKER - BACKEND v3.0            ║
╠═══════════════════════════════════════════════════╣
║  HTTP Server: http://localhost:3001               ║
║  WebSocket:   ws://localhost:3001/ws              ║
║  Servers:     46 CS2/Valve servers                ║
║  Concurrency: 8 parallel probes                   ║
╠═══════════════════════════════════════════════════╣
║  IMPORTANT: No invented ping values!              ║
║  Blocked servers show time: null                  ║
╚═══════════════════════════════════════════════════╝
```

---

## 📡 API Endpoints

### `GET /ping`

Full server-side probe of all CS2 servers.

**Response:**
```json
{
  "mode": "server",
  "modeDescription": "Server-side ICMP/UDP probes...",
  "user": {
    "ip": "123.45.67.89",
    "isp": "Your ISP",
    "country": "Country",
    "city": "City",
    "countryCode": "XX"
  },
  "servers": [
    {
      "name": "CS2 EU West (Luxembourg)",
      "host": "155.133.248.2",
      "region": "eu",
      "country": "LU",
      "reachable": true,
      "alive": true,
      "time": 35,
      "method": "icmp",
      "status": "excellent"
    },
    {
      "name": "CS2 UAE (Dubai)",
      "host": "155.133.240.2",
      "region": "me",
      "country": "AE",
      "reachable": true,
      "alive": true,
      "time": null,
      "method": "blocked",
      "status": "blocked"
    }
  ],
  "stats": {
    "total": 46,
    "measured": 30,
    "blocked": 12,
    "offline": 4
  },
  "timestamp": "2024-01-15T12:00:00.000Z",
  "checkDuration": "8.5"
}
```

### `GET /rtt`

Simple endpoint for browser RTT testing.

```json
{ "timestamp": 1705320000000, "server": "pong" }
```

### `GET /servers`

List all servers without probing.

### `GET /user`

User geolocation info only.

### `GET /health`

Health check.

### `WS /ws`

WebSocket for browser RTT measurement.

**Send:**
```json
{"type":"ping","timestamp":1705320000000}
```

**Receive:**
```json
{"type":"pong","timestamp":1705320000000,"serverTime":1705320000005}
```

---

## 🧪 Testing

### cURL Tests

```bash
# Health check
curl http://localhost:3001/health

# List servers (no probing)
curl http://localhost:3001/servers

# Full probe (takes ~10s with parallel execution)
curl http://localhost:3001/ping

# RTT endpoint
curl http://localhost:3001/rtt
```

### WebSocket Test (wscat)

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c ws://localhost:3001/ws

# Send ping
> {"type":"ping","timestamp":1705320000000}

# Expect pong
< {"type":"pong","timestamp":1705320000000,"serverTime":1705320000005}
```

### Validate Response

Check that:
1. `time` is `null` for `method: "blocked"` servers (no fake values!)
2. Servers are sorted: measured (by time) → blocked → offline
3. `stats.measured + stats.blocked + stats.offline === stats.total`

---

## 🌍 Server Regions

| Region | Code | Servers |
|--------|------|---------|
| Europe | eu | 11 |
| CIS/Russia | cis | 4 |
| Central Asia | asia | 3 (incl. Kazakhstan) |
| North America | us | 7 |
| Asia | asia | 8 |
| South America | sa | 4 |
| Oceania | oceania | 2 |
| Middle East | me | 2 |
| Africa | africa | 1 |

---

## 🔧 Configuration

Edit `backend/server.js`:

```javascript
const PING_TIMEOUT = 2;        // ICMP timeout (seconds)
const UDP_TIMEOUT = 2000;      // UDP timeout (ms)
const CONCURRENCY_LIMIT = 8;   // Parallel probes
const STEAM_PORT = 27015;      // UDP query port
```

---

## 🚀 Deployment Notes

### When Deployed Publicly

1. **Server-side probes measure from your server**, not from visitors
2. Use **Client Mode** (WebSocket RTT) for visitor latency estimation
3. Clearly label results as "server-measured" or "client-estimate"

### Recommended Setup

```
Your Server (VPS) ──► Runs backend, probes servers
                 ──► Serves frontend
                 
Visitor Browser ──► Connects via WebSocket
                ──► Measures RTT to your server
                ──► Shows estimation disclaimer
```

---

## 📝 Changelog v3.0

- ✅ **No invented ping values** - blocked servers show `null`, not estimates
- ✅ **Parallel probing** with concurrency limit (8 by default)
- ✅ **Proper sorting**: measured → blocked → offline
- ✅ **Honest UI** with clear mode indicators and disclaimers
- ✅ **WebSocket RTT** for browser-based estimation
- ✅ **New status**: `blocked` (purple) for servers that block probes
- ✅ **Strict thresholds**: 0-40ms excellent, 41-80ms good, >80ms poor

---

## 📄 License

MIT

---

*Valve™, Steam™, and Counter-Strike™ are trademarks of Valve Corporation.*
