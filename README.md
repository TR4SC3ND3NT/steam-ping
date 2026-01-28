# 🎮 CS2 Ping Checker

Real-time latency checker for CS2/Valve matchmaking servers.

## 🚀 Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

### One-Click Deploy:
1. Fork this repo
2. Go to [Railway](https://railway.app)
3. New Project → Deploy from GitHub repo
4. Select your fork
5. Done! Railway auto-detects Dockerfile

### Manual Deploy:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login & deploy
railway login
railway init
railway up
```

---

## 🐳 Local Docker Run

```bash
# Build & run
docker build -t cs2-ping .
docker run -p 8080:8080 --cap-add NET_RAW cs2-ping

# Open http://localhost:8080
```

Or with docker-compose:
```bash
docker compose up --build
```

---

## 💻 Local Development (without Docker)

```bash
# Terminal 1 - Backend
cd backend
npm install
node server.js

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev

# Open http://localhost:5173
```

---

## 📁 Project Structure

```
/
├── Dockerfile          # Single container (nginx + node)
├── nginx.conf          # Proxy config
├── start.sh            # Startup script
├── railway.json        # Railway config
│
├── /frontend           # React + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── ServerList.jsx
│   │   └── index.css
│   └── package.json
│
└── /backend            # Node.js + Express
    ├── server.js
    └── package.json
```

---

## 🌐 Architecture

```
┌─────────────────────────────────────────┐
│         Container (:8080)               │
├─────────────────────────────────────────┤
│  nginx (:8080)                          │
│    ├── /          → React SPA           │
│    ├── /api/*     → node backend        │
│    └── /ws        → WebSocket           │
│                                         │
│  node (:3001)                           │
│    ├── ICMP ping                        │
│    ├── UDP A2S query                    │
│    └── WebSocket RTT                    │
└─────────────────────────────────────────┘
```

---

## ⚠️ Important Notes

### ICMP Ping on Cloud Platforms
- **Railway/Render/Fly.io**: ICMP may not work (no NET_RAW capability)
- **VPS with Docker**: Use `--cap-add NET_RAW` for ICMP
- The app gracefully falls back to marking servers as "blocked" if ICMP fails

### Ping Accuracy
- **Local run**: Accurate ICMP/UDP from your machine
- **Cloud deploy**: Measures from server location, not user's device
- Browser RTT estimation is provided for reference

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend port (internal) |
| `NODE_ENV` | `production` | Environment |

---

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/ping` | Probe all servers |
| `GET /api/servers` | List servers (no probe) |
| `GET /api/user` | User IP/ISP info |
| `GET /api/health` | Health check |
| `WS /ws` | WebSocket for RTT |

---

## 🎯 Status Classification

| Status | Latency | Color |
|--------|---------|-------|
| 🟢 Excellent | 0-40ms | Green |
| 🟡 Good | 41-80ms | Yellow |
| 🔴 Poor | >80ms | Red |
| 🟣 Blocked | — | Purple |
| ⚫ Offline | — | Gray |

---

## 📜 License

MIT

*Valve™ and Counter-Strike™ are trademarks of Valve Corporation.*
