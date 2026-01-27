import { useState, useEffect, useRef, useCallback } from 'react'
import ServerList from './ServerList'

// ============================================
// CONFIGURATION - Production Ready
// ============================================
// In production (Docker/nginx): use /api prefix, nginx proxies to backend
// In development: Vite proxy handles /api -> localhost:3001
const API_URL = import.meta.env.VITE_API_URL || '/api';

// WebSocket URL: auto-detect protocol and host
const WS_URL = import.meta.env.PROD
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
  : 'ws://localhost:3001/ws';

// ============================================
// MAIN COMPONENT
// ============================================
function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Mode: 'local' = server ICMP/UDP, 'client' = browser RTT estimation
  const [mode, setMode] = useState('detecting');
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [browserRTT, setBrowserRTT] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  const wsRef = useRef(null);
  const rttSamplesRef = useRef([]);

  // Detect if running locally
  useEffect(() => {
    const host = window.location.hostname;
    const local = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    setIsLocalhost(local);
    // Default mode based on environment
    setMode(local ? 'local' : 'client');
  }, []);

  // ============================================
  // WEBSOCKET RTT MEASUREMENT
  // ============================================
  const measureRTT = useCallback(() => {
    return new Promise((resolve) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        // Fallback: HTTP RTT
        const start = performance.now();
        fetch(`${API_URL}/rtt?t=${Date.now()}`)
          .then(() => resolve(Math.round(performance.now() - start)))
          .catch(() => resolve(null));
        return;
      }

      const start = performance.now();
      const handler = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pong') {
            wsRef.current?.removeEventListener('message', handler);
            resolve(Math.round(performance.now() - start));
          }
        } catch { resolve(null); }
      };
      
      wsRef.current.addEventListener('message', handler);
      wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      
      setTimeout(() => {
        wsRef.current?.removeEventListener('message', handler);
        resolve(null);
      }, 5000);
    });
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (mode !== 'client') return;

    const connect = () => {
      try {
        wsRef.current = new WebSocket(WS_URL);
        wsRef.current.onopen = () => {
          console.log('🔌 WebSocket connected');
          setWsConnected(true);
        };
        wsRef.current.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          setWsConnected(false);
          setTimeout(connect, 3000);
        };
        wsRef.current.onerror = () => setWsConnected(false);
      } catch (e) {
        console.error('WebSocket error:', e);
      }
    };

    connect();
    return () => wsRef.current?.close();
  }, [mode]);

  // Periodic RTT measurement in client mode
  useEffect(() => {
    if (mode !== 'client') return;

    const measure = async () => {
      const rtt = await measureRTT();
      if (rtt !== null) {
        rttSamplesRef.current.push(rtt);
        if (rttSamplesRef.current.length > 5) rttSamplesRef.current.shift();
        const avg = Math.round(
          rttSamplesRef.current.reduce((a, b) => a + b, 0) / rttSamplesRef.current.length
        );
        setBrowserRTT(avg);
      }
    };

    measure();
    const interval = setInterval(measure, 5000);
    return () => clearInterval(interval);
  }, [mode, measureRTT]);

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchData = async (isRecheck = false) => {
    if (isRecheck) setIsUpdating(true);
    else setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/ping`);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      const result = await response.json();
      
      // In client mode, add browser RTT info but don't fake server times
      if (mode === 'client') {
        result.browserRTT = browserRTT;
        result.latencyType = 'client-rtt';
        result.modeDescription = 'Browser RTT estimation. Server-side probes shown for reference only.';
      } else {
        result.latencyType = 'server-measured';
      }
      
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to connect');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (mode === 'detecting') return;
    const timer = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(timer);
  }, [mode]);

  // ============================================
  // HELPERS
  // ============================================
  const bestServer = data?.servers?.find(s => s.time !== null);
  const measuredCount = data?.stats?.measured || 0;
  const totalCount = data?.stats?.total || 0;

  const getCountryFlag = (code) => {
    if (!code) return '🌍';
    try {
      return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
    } catch { return '🌍'; }
  };

  const getStatusClass = (time) => {
    if (time === null) return 'blocked';
    if (time <= 40) return 'excellent';
    if (time <= 80) return 'good';
    return 'poor';
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="app">
      {/* Background */}
      <div className="bg-grid"></div>
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="none">
                <path d="M24 4L8 14v12c0 11.25 6.8 21.75 16 24 9.2-2.25 16-12.75 16-24V14L24 4z" 
                      fill="url(#grad)" stroke="#f97316" strokeWidth="2"/>
                <circle cx="24" cy="22" r="7" fill="#0f172a" stroke="#fb923c" strokeWidth="2"/>
                <circle cx="24" cy="22" r="2" fill="#f97316"/>
                <defs>
                  <linearGradient id="grad" x1="8" y1="4" x2="40" y2="44">
                    <stop stopColor="#f97316" stopOpacity="0.3"/>
                    <stop offset="1" stopColor="#ea580c" stopOpacity="0.1"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1>CS2 Server Latency</h1>
              <p className="tagline">Honest ping checker - no fake values</p>
            </div>
          </div>
          
          {data && !loading && (
            <div className="header-stats">
              <span className="stat-badge">
                <span className="stat-dot online"></span>
                {measuredCount}/{totalCount} Measured
              </span>
            </div>
          )}
        </header>

        {/* Mode Indicator */}
        <div className="mode-indicator glass">
          <div className="mode-icon">
            {mode === 'local' ? '🖥️' : mode === 'client' ? '🌐' : '⏳'}
          </div>
          <div className="mode-info">
            <span className="mode-title">
              {mode === 'local' && 'Local Mode (Server ICMP/UDP)'}
              {mode === 'client' && 'Client Mode (Browser RTT)'}
              {mode === 'detecting' && 'Detecting...'}
            </span>
            <span className="mode-description">
              {mode === 'local' && 'Accurate probes from this machine. For local/dev use.'}
              {mode === 'client' && (
                <>
                  Browser RTT to backend: {browserRTT !== null ? `${browserRTT}ms` : 'measuring...'}
                  {wsConnected && <span className="ws-status"> • WS Connected</span>}
                </>
              )}
            </span>
          </div>
          {isLocalhost && (
            <div className="mode-toggle">
              <button 
                className={`mode-btn ${mode === 'local' ? 'active' : ''}`}
                onClick={() => setMode('local')}
              >
                Local
              </button>
              <button 
                className={`mode-btn ${mode === 'client' ? 'active' : ''}`}
                onClick={() => setMode('client')}
              >
                Client
              </button>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="disclaimer glass">
          <span className="disclaimer-icon">ℹ️</span>
          <p>
            <strong>Accuracy Notice:</strong> Browsers cannot perform true ICMP/UDP probes. 
            {mode === 'client' 
              ? ' Client mode shows Browser RTT as an estimate. Server-side results are for reference.'
              : ' Local mode probes from this server - results accurate for this host only.'
            }
          </p>
        </div>

        {/* User Info + Recheck */}
        <section className="user-section">
          <div className="card user-card glass">
            <div className="card-header">
              <span className="card-icon">🌐</span>
              <span>Your Connection</span>
            </div>
            
            {loading && !data ? (
              <div className="skeleton-loader">
                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-text short"></div>
              </div>
            ) : error && !data ? (
              <div className="error-inline">{error}</div>
            ) : data?.user ? (
              <div className="user-grid">
                <div className="user-item">
                  <span className="user-label">IP Address</span>
                  <span className="user-value mono">{data.user.ip}</span>
                </div>
                <div className="user-item">
                  <span className="user-label">Provider</span>
                  <span className="user-value">{data.user.isp}</span>
                </div>
                <div className="user-item">
                  <span className="user-label">Location</span>
                  <span className="user-value">
                    {data.user.countryCode && (
                      <span className="country-flag">{getCountryFlag(data.user.countryCode)}</span>
                    )}
                    {data.user.city}, {data.user.country}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <button 
            className={`btn-recheck ${loading || isUpdating ? 'loading' : ''}`}
            onClick={() => fetchData(true)}
            disabled={loading || isUpdating}
          >
            {loading || isUpdating ? (
              <>
                <div className="btn-spinner"></div>
                <span>Checking...</span>
              </>
            ) : (
              <>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
                <span>Recheck</span>
              </>
            )}
          </button>
        </section>

        {/* Best Server */}
        {bestServer && !loading && (
          <section className="best-section">
            <div className="best-card glass">
              <div className="best-header">
                <span className="best-badge">⚡ BEST MEASURED SERVER</span>
                <span className={`method-badge ${bestServer.method}`}>
                  {bestServer.method.toUpperCase()}
                </span>
              </div>
              <div className="best-content">
                <div className="best-info">
                  <span className="best-flag">{getCountryFlag(bestServer.country)}</span>
                  <div>
                    <span className="best-name">{bestServer.name}</span>
                    <span className="best-host">{bestServer.host}</span>
                  </div>
                </div>
                <div className="best-ping">
                  <span className={`best-value ${getStatusClass(bestServer.time)}`}>
                    {bestServer.time}
                  </span>
                  <span className="best-unit">ms</span>
                </div>
              </div>
              <div className="best-bar">
                <div 
                  className={`best-bar-fill ${getStatusClass(bestServer.time)}`}
                  style={{ width: `${Math.min(100, (bestServer.time / 150) * 100)}%` }}
                ></div>
              </div>
            </div>
          </section>
        )}

        {/* Stats Summary */}
        {data?.stats && !loading && (
          <div className="stats-summary glass">
            <div className="stats-item">
              <span className="stats-value">{data.stats.measured}</span>
              <span className="stats-label">Measured</span>
            </div>
            <div className="stats-divider"></div>
            <div className="stats-item">
              <span className="stats-value blocked">{data.stats.blocked}</span>
              <span className="stats-label">Blocked</span>
            </div>
            <div className="stats-divider"></div>
            <div className="stats-item">
              <span className="stats-value offline">{data.stats.offline}</span>
              <span className="stats-label">Offline</span>
            </div>
            {mode === 'client' && browserRTT !== null && (
              <>
                <div className="stats-divider"></div>
                <div className="stats-item">
                  <span className="stats-value browser-rtt">{browserRTT}</span>
                  <span className="stats-label">Your RTT (ms)</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Servers Section */}
        <section className="servers-section">
          <div className="section-header">
            <h2>
              <span className="section-icon">📡</span>
              All CS2 Servers
            </h2>
            {data?.timestamp && (
              <span className="last-check">
                {new Date(data.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>

          {loading && !data ? (
            <div className="loading-container glass">
              <div className="loading-spinner"></div>
              <p>Probing CS2 servers...</p>
              <span className="loading-sub">Parallel ICMP/UDP checks in progress</span>
            </div>
          ) : error && !data ? (
            <div className="error-container glass">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
              <button onClick={() => fetchData()} className="btn-retry">Retry</button>
            </div>
          ) : (
            <ServerList 
              servers={data?.servers || []} 
              isUpdating={isUpdating}
              mode={mode}
            />
          )}
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="legend">
            <div className="legend-item">
              <span className="legend-dot excellent"></span>
              <span>0-40ms Excellent</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot good"></span>
              <span>41-80ms Good</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot poor"></span>
              <span>&gt;80ms Poor</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot blocked"></span>
              <span>Blocked (no data)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot offline"></span>
              <span>Offline</span>
            </div>
          </div>

          <p className="credits">
            CS2 Ping Checker v3.0 • Honest measurements only • No invented values
          </p>
          <p className="credits-sub">
            Valve™ and Counter-Strike™ are trademarks of Valve Corporation
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
