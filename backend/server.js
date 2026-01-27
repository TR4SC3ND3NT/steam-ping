const express = require('express');
const cors = require('cors');
const ping = require('ping');
const dgram = require('dgram');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// CONFIGURATION
// ============================================
const PING_TIMEOUT = 2; // seconds for ICMP
const UDP_TIMEOUT = 2000; // ms for UDP
const CONCURRENCY_LIMIT = 8; // parallel probes
const STEAM_PORT = 27015;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Forwarded-For', 'X-Real-IP']
}));
app.use(express.json());

// ============================================
// CS2 SERVER LIST (Valve official IPs)
// ============================================
const CS2_SERVERS = [
  // EUROPE
  { name: 'CS2 EU West (Luxembourg)', host: '155.133.248.2', region: 'eu', country: 'LU' },
  { name: 'CS2 EU West 2 (Luxembourg)', host: '155.133.249.2', region: 'eu', country: 'LU' },
  { name: 'CS2 EU East (Vienna)', host: '155.133.254.2', region: 'eu', country: 'AT' },
  { name: 'CS2 EU East 2 (Vienna)', host: '155.133.255.2', region: 'eu', country: 'AT' },
  { name: 'CS2 EU North (Stockholm)', host: '155.133.246.2', region: 'eu', country: 'SE' },
  { name: 'CS2 EU North 2 (Stockholm)', host: '155.133.247.2', region: 'eu', country: 'SE' },
  { name: 'CS2 Poland (Warsaw)', host: '155.133.252.2', region: 'eu', country: 'PL' },
  { name: 'CS2 Poland 2 (Warsaw)', host: '155.133.253.2', region: 'eu', country: 'PL' },
  { name: 'CS2 Spain (Madrid)', host: '155.133.232.2', region: 'eu', country: 'ES' },
  { name: 'CS2 Germany (Frankfurt)', host: '155.133.244.2', region: 'eu', country: 'DE' },
  { name: 'CS2 Finland (Helsinki)', host: '155.133.242.2', region: 'eu', country: 'FI' },
  
  // RUSSIA & CIS
  { name: 'CS2 Russia (Moscow)', host: '185.25.180.2', region: 'cis', country: 'RU' },
  { name: 'CS2 Russia 2 (Moscow)', host: '185.25.181.2', region: 'cis', country: 'RU' },
  { name: 'CS2 Russia (St. Petersburg)', host: '185.25.182.2', region: 'cis', country: 'RU' },
  { name: 'CS2 Russia (Ekaterinburg)', host: '185.25.183.2', region: 'cis', country: 'RU' },
  
  // CENTRAL ASIA
  { name: 'CS2 Kazakhstan (Almaty)', host: '155.133.241.2', region: 'asia', country: 'KZ' },
  { name: 'CS2 Central Asia (Tashkent)', host: '155.133.240.5', region: 'asia', country: 'UZ' },
  { name: 'CS2 Siberia (Novosibirsk)', host: '185.25.183.5', region: 'cis', country: 'RU' },
  
  // USA
  { name: 'CS2 US East (Virginia)', host: '162.254.192.2', region: 'us', country: 'US' },
  { name: 'CS2 US East 2 (Virginia)', host: '162.254.192.3', region: 'us', country: 'US' },
  { name: 'CS2 US West (Seattle)', host: '162.254.193.2', region: 'us', country: 'US' },
  { name: 'CS2 US West 2 (LA)', host: '162.254.194.2', region: 'us', country: 'US' },
  { name: 'CS2 US West 3 (LA)', host: '162.254.195.2', region: 'us', country: 'US' },
  { name: 'CS2 US Central (Chicago)', host: '162.254.196.2', region: 'us', country: 'US' },
  { name: 'CS2 US Central 2 (Dallas)', host: '162.254.197.2', region: 'us', country: 'US' },
  
  // ASIA
  { name: 'CS2 Singapore', host: '103.10.124.2', region: 'asia', country: 'SG' },
  { name: 'CS2 Singapore 2', host: '103.28.54.2', region: 'asia', country: 'SG' },
  { name: 'CS2 Japan (Tokyo)', host: '45.121.185.2', region: 'asia', country: 'JP' },
  { name: 'CS2 Japan 2 (Tokyo)', host: '45.121.185.3', region: 'asia', country: 'JP' },
  { name: 'CS2 Hong Kong', host: '155.133.238.2', region: 'asia', country: 'HK' },
  { name: 'CS2 Hong Kong 2', host: '155.133.239.2', region: 'asia', country: 'HK' },
  { name: 'CS2 India (Mumbai)', host: '155.133.236.2', region: 'asia', country: 'IN' },
  { name: 'CS2 India 2 (Chennai)', host: '155.133.237.2', region: 'asia', country: 'IN' },
  { name: 'CS2 South Korea (Seoul)', host: '155.133.234.2', region: 'asia', country: 'KR' },
  { name: 'CS2 China (Shanghai)', host: '155.133.235.2', region: 'asia', country: 'CN' },
  { name: 'CS2 Taiwan (Taipei)', host: '155.133.233.2', region: 'asia', country: 'TW' },
  
  // SOUTH AMERICA
  { name: 'CS2 Brazil (São Paulo)', host: '205.185.194.2', region: 'sa', country: 'BR' },
  { name: 'CS2 Brazil 2 (São Paulo)', host: '205.185.194.3', region: 'sa', country: 'BR' },
  { name: 'CS2 Chile (Santiago)', host: '205.185.195.2', region: 'sa', country: 'CL' },
  { name: 'CS2 Peru (Lima)', host: '205.185.196.2', region: 'sa', country: 'PE' },
  { name: 'CS2 Argentina (Buenos Aires)', host: '205.185.197.2', region: 'sa', country: 'AR' },
  
  // OCEANIA
  { name: 'CS2 Australia (Sydney)', host: '45.121.184.2', region: 'oceania', country: 'AU' },
  { name: 'CS2 Australia 2 (Sydney)', host: '45.121.184.3', region: 'oceania', country: 'AU' },
  
  // MIDDLE EAST
  { name: 'CS2 UAE (Dubai)', host: '155.133.240.2', region: 'me', country: 'AE' },
  { name: 'CS2 UAE 2 (Dubai)', host: '155.133.240.3', region: 'me', country: 'AE' },
  
  // AFRICA
  { name: 'CS2 South Africa (Johannesburg)', host: '155.133.230.2', region: 'africa', country: 'ZA' },
];

// Known Valve IP prefixes (for identifying blocked but valid servers)
const VALVE_IP_PREFIXES = [
  '155.133.', '162.254.', '185.25.180.', '185.25.181.', '185.25.182.', '185.25.183.',
  '103.10.124.', '103.28.54.', '45.121.184.', '45.121.185.', '205.185.194.',
  '205.185.195.', '205.185.196.', '205.185.197.'
];

const isWindows = process.platform === 'win32';

// ============================================
// UTILITY: Check if IP belongs to Valve
// ============================================
function isValveIP(ip) {
  return VALVE_IP_PREFIXES.some(prefix => ip.startsWith(prefix));
}

// ============================================
// UTILITY: Parallel execution with concurrency limit
// No external dependencies - simple implementation
// ============================================
async function parallelLimit(tasks, limit) {
  const results = [];
  const executing = new Set();
  
  for (const [index, task] of tasks.entries()) {
    const promise = Promise.resolve().then(() => task()).then(result => {
      executing.delete(promise);
      return { index, result };
    });
    
    executing.add(promise);
    results.push(promise);
    
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  
  const completed = await Promise.all(results);
  // Sort by original index to maintain order
  completed.sort((a, b) => a.index - b.index);
  return completed.map(c => c.result);
}

// ============================================
// UTILITY: Get client IP
// ============================================
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  
  const realIP = req.headers['x-real-ip'];
  if (realIP) return realIP;
  
  const cfIP = req.headers['cf-connecting-ip'];
  if (cfIP) return cfIP;
  
  let ip = req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || 'Unknown';
  if (ip.startsWith('::ffff:')) ip = ip.substring(7);
  
  return ip;
}

// ============================================
// UTILITY: Get user info from IP
// ============================================
async function getUserInfo(ip) {
  try {
    const isLocal = ip === '::1' || ip === '127.0.0.1' || 
                    ip.startsWith('192.168.') || ip.startsWith('10.') || 
                    ip.startsWith('172.16.') || ip === 'Unknown';
    
    const url = isLocal ? 'http://ip-api.com/json/' : `http://ip-api.com/json/${ip}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    const data = await response.json();
    
    return {
      ip: data.query || ip,
      isp: data.isp || 'Unknown',
      country: data.country || 'Unknown',
      city: data.city || 'Unknown',
      countryCode: data.countryCode || '',
      region: data.regionName || '',
      lat: data.lat || 0,
      lon: data.lon || 0
    };
  } catch (error) {
    console.error('User info error:', error.message);
    return { ip, isp: 'Unknown', country: 'Unknown', city: 'Unknown', countryCode: '' };
  }
}

// ============================================
// PROBE: ICMP Ping
// ============================================
async function icmpPing(host) {
  try {
    const config = {
      timeout: PING_TIMEOUT,
      extra: isWindows 
        ? ['-n', '2', '-w', String(PING_TIMEOUT * 1000)] 
        : ['-c', '2', '-W', String(PING_TIMEOUT)]
    };
    
    const result = await ping.promise.probe(host, config);
    
    if (result.alive) {
      const time = Math.round(parseFloat(result.avg) || parseFloat(result.time) || 0);
      if (time > 0 && time < PING_TIMEOUT * 1000) {
        return { success: true, time, method: 'icmp' };
      }
    }
    
    return { success: false, time: null, method: 'icmp' };
  } catch (error) {
    return { success: false, time: null, method: 'icmp', error: error.message };
  }
}

// ============================================
// PROBE: UDP Steam A2S Query
// ============================================
function udpPing(host, port = STEAM_PORT) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = dgram.createSocket('udp4');
    
    const timeout = setTimeout(() => {
      socket.close();
      resolve({ success: false, time: null, method: 'udp' });
    }, UDP_TIMEOUT);
    
    // Steam A2S_INFO query packet
    const query = Buffer.from([
      0xFF, 0xFF, 0xFF, 0xFF, 0x54,
      0x53, 0x6F, 0x75, 0x72, 0x63, 0x65, 0x20,
      0x45, 0x6E, 0x67, 0x69, 0x6E, 0x65, 0x20,
      0x51, 0x75, 0x65, 0x72, 0x79, 0x00
    ]);
    
    socket.on('message', () => {
      clearTimeout(timeout);
      const time = Date.now() - startTime;
      socket.close();
      resolve({ success: true, time, method: 'udp' });
    });
    
    socket.on('error', () => {
      clearTimeout(timeout);
      socket.close();
      resolve({ success: false, time: null, method: 'udp' });
    });
    
    socket.send(query, 0, query.length, port, host, (err) => {
      if (err) {
        clearTimeout(timeout);
        socket.close();
        resolve({ success: false, time: null, method: 'udp' });
      }
    });
  });
}

// ============================================
// PROBE: Combined server check
// IMPORTANT: We do NOT invent or estimate ping values.
// If probes fail, time remains null.
// ============================================
async function probeServer(server) {
  // Step 1: Try ICMP
  const icmpResult = await icmpPing(server.host);
  
  if (icmpResult.success) {
    return {
      ...server,
      alive: true,
      reachable: true,
      time: icmpResult.time,
      method: 'icmp',
      status: getStatus(icmpResult.time)
    };
  }
  
  // Step 2: ICMP failed, try UDP
  const udpResult = await udpPing(server.host);
  
  if (udpResult.success) {
    return {
      ...server,
      alive: true,
      reachable: true,
      time: udpResult.time,
      method: 'udp',
      status: getStatus(udpResult.time)
    };
  }
  
  // Step 3: Both failed. Check if this is a known Valve IP.
  // If yes, mark as 'blocked' (server exists but blocks probes).
  // We do NOT assign a numeric time - that would be dishonest.
  if (isValveIP(server.host)) {
    return {
      ...server,
      alive: true, // We assume Valve servers are alive
      reachable: true, // Network path exists, just blocked
      time: null, // IMPORTANT: No invented value
      method: 'blocked',
      status: 'blocked'
    };
  }
  
  // Step 4: Unknown IP and no response - truly offline/unreachable
  return {
    ...server,
    alive: false,
    reachable: false,
    time: null,
    method: 'none',
    status: 'offline'
  };
}

// ============================================
// UTILITY: Get status from ping time
// ============================================
function getStatus(time) {
  if (time === null) return 'blocked';
  if (time <= 40) return 'excellent';
  if (time <= 80) return 'good';
  return 'poor';
}

// ============================================
// PROBE: All servers in parallel
// ============================================
async function probeAllServers() {
  console.log(`📡 Starting parallel probe of ${CS2_SERVERS.length} servers (concurrency: ${CONCURRENCY_LIMIT})...`);
  const startTime = Date.now();
  
  const tasks = CS2_SERVERS.map(server => () => probeServer(server));
  const results = await parallelLimit(tasks, CONCURRENCY_LIMIT);
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Probe complete in ${elapsed}s`);
  
  // Sort: measured (by time asc) -> blocked -> offline
  return results.sort((a, b) => {
    // Both have numeric time: sort by time
    if (a.time !== null && b.time !== null) {
      return a.time - b.time;
    }
    // Only a has time: a comes first
    if (a.time !== null && b.time === null) return -1;
    // Only b has time: b comes first
    if (a.time === null && b.time !== null) return 1;
    // Neither has time: blocked before offline
    if (a.method === 'blocked' && b.method !== 'blocked') return -1;
    if (a.method !== 'blocked' && b.method === 'blocked') return 1;
    // Same category: maintain order
    return 0;
  });
}

// ============================================
// HTTP SERVER + WEBSOCKET
// ============================================
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// WebSocket for browser RTT measurement
wss.on('connection', (ws, req) => {
  const clientIP = getClientIP(req);
  console.log(`🔌 WebSocket connected: ${clientIP}`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'ping') {
        // Immediate pong for RTT measurement
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: data.timestamp,
          serverTime: Date.now()
        }));
      }
    } catch (e) {
      console.error('WS message error:', e);
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected: ${clientIP}`);
  });
});

// ============================================
// API ENDPOINTS
// ============================================

// Main endpoint: server-side probe
app.get('/ping', async (req, res) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  
  console.log('\n🎮 ═══════════════════════════════════════');
  console.log('   CS2 PING CHECK - SERVER MODE');
  console.log('═══════════════════════════════════════\n');
  
  try {
    const userInfo = await getUserInfo(clientIP);
    
    console.log(`👤 Client: ${userInfo.ip}`);
    console.log(`🌐 ISP: ${userInfo.isp}`);
    console.log(`📍 Location: ${userInfo.city}, ${userInfo.country}\n`);
    
    const servers = await probeAllServers();
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Calculate stats
    const measured = servers.filter(s => s.time !== null).length;
    const blocked = servers.filter(s => s.method === 'blocked').length;
    const offline = servers.filter(s => s.method === 'none').length;
    
    console.log(`\n📊 Stats: ${measured} measured, ${blocked} blocked, ${offline} offline`);
    
    if (servers[0]?.time !== null) {
      console.log(`⚡ Best: ${servers[0].name} (${servers[0].time}ms via ${servers[0].method})\n`);
    }
    
    res.json({
      mode: 'server',
      modeDescription: 'Server-side ICMP/UDP probes. Results reflect latency FROM THIS SERVER, not from your browser.',
      user: userInfo,
      servers,
      stats: {
        total: CS2_SERVERS.length,
        measured,
        blocked,
        offline
      },
      timestamp: new Date().toISOString(),
      checkDuration: elapsed
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// RTT endpoint for browser testing
app.get('/rtt', (req, res) => {
  res.json({ timestamp: Date.now(), server: 'pong' });
});

// User info only
app.get('/user', async (req, res) => {
  const clientIP = getClientIP(req);
  const userInfo = await getUserInfo(clientIP);
  res.json(userInfo);
});

// Server list without probing
app.get('/servers', (req, res) => {
  res.json({
    servers: CS2_SERVERS,
    total: CS2_SERVERS.length,
    regions: [...new Set(CS2_SERVERS.map(s => s.region))],
    countries: [...new Set(CS2_SERVERS.map(s => s.country))]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    serverCount: CS2_SERVERS.length,
    concurrencyLimit: CONCURRENCY_LIMIT,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// START SERVER
// ============================================
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║     🎮 CS2 PING CHECKER - BACKEND v3.0            ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  HTTP Server: http://localhost:${PORT}                 ║`);
  console.log(`║  WebSocket:   ws://localhost:${PORT}/ws                ║`);
  console.log(`║  Servers:     ${CS2_SERVERS.length} CS2/Valve servers              ║`);
  console.log(`║  Concurrency: ${CONCURRENCY_LIMIT} parallel probes               ║`);
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log('║  Endpoints:                                       ║');
  console.log('║    GET /ping    - Full probe (ICMP/UDP)           ║');
  console.log('║    GET /rtt     - Browser RTT test                ║');
  console.log('║    GET /user    - User info only                  ║');
  console.log('║    GET /servers - List all servers                ║');
  console.log('║    GET /health  - Health check                    ║');
  console.log('║    WS  /ws      - WebSocket for browser RTT       ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log('║  IMPORTANT: No invented ping values!              ║');
  console.log('║  Blocked servers show time: null                  ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('\n');
});
