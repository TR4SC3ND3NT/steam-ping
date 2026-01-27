import { useState, useEffect } from 'react'

// ============================================
// STATUS HELPERS
// ============================================
function getStatusClass(server) {
  if (server.method === 'blocked') return 'blocked';
  if (server.method === 'none' || !server.reachable) return 'offline';
  if (server.time === null) return 'blocked';
  if (server.time <= 40) return 'excellent';
  if (server.time <= 80) return 'good';
  return 'poor';
}

function getStatusText(server) {
  const status = getStatusClass(server);
  const texts = {
    excellent: 'Excellent',
    good: 'Good',
    poor: 'Poor',
    blocked: 'Blocked',
    offline: 'Offline'
  };
  return texts[status] || status;
}

function getCountryFlag(code) {
  if (!code) return '🌍';
  try {
    return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
  } catch { return '🌍'; }
}

function getRegionLabel(region) {
  const labels = {
    eu: 'EU', us: 'NA', asia: 'ASIA', sa: 'SA',
    oceania: 'OCE', me: 'ME', africa: 'AF', cis: 'CIS'
  };
  return labels[region] || '??';
}

// ============================================
// SERVER CARD COMPONENT
// ============================================
function ServerCard({ server, rank, isUpdating, isBest }) {
  const status = getStatusClass(server);
  const flag = getCountryFlag(server.country);
  const regionLabel = getRegionLabel(server.region);
  
  return (
    <div className={`server-card ${status} ${isUpdating ? 'updating' : ''} ${isBest ? 'is-best' : ''}`}>
      {/* Rank */}
      <div className="server-rank">
        {isBest ? <span className="rank-best">★</span> : <span>#{rank}</span>}
      </div>
      
      {/* Region Flag */}
      <div className="server-region">
        <span className="region-flag" title={server.country}>{flag}</span>
        <span className="region-label">{regionLabel}</span>
      </div>
      
      {/* Server Info */}
      <div className="server-main">
        <div className="server-name">{server.name}</div>
        <div className="server-host">{server.host}</div>
      </div>
      
      {/* Method Badge */}
      <div className="server-method">
        <span className={`method-tag ${server.method}`} title={getMethodTooltip(server.method)}>
          {getMethodIcon(server.method)}
          <span className="method-text">{server.method.toUpperCase()}</span>
        </span>
      </div>
      
      {/* Ping Value */}
      <div className="server-ping">
        {isUpdating ? (
          <div className="mini-spinner"></div>
        ) : server.time !== null ? (
          <>
            <span className="ping-value">{server.time}</span>
            <span className="ping-unit">ms</span>
          </>
        ) : server.method === 'blocked' ? (
          <span className="ping-blocked">—</span>
        ) : (
          <span className="ping-offline">N/A</span>
        )}
      </div>
      
      {/* Status Badge */}
      <div className={`server-status ${status}`}>
        <div className="status-dot"></div>
        <span className="status-text">{getStatusText(server)}</span>
      </div>

      {/* Ping Bar (only for measured) */}
      {server.time !== null && (
        <div className="server-bar">
          <div 
            className={`server-bar-fill ${status}`}
            style={{ width: `${Math.min(100, (server.time / 150) * 100)}%` }}
          ></div>
        </div>
      )}

      {/* Blocked indicator tooltip */}
      {server.method === 'blocked' && (
        <div className="server-note" title="Server blocks ICMP/UDP probes but is a known Valve IP">
          🔒
        </div>
      )}
    </div>
  );
}

function getMethodIcon(method) {
  switch (method) {
    case 'icmp': return '📶';
    case 'udp': return '🎮';
    case 'blocked': return '🔒';
    case 'none': return '❌';
    default: return '❓';
  }
}

function getMethodTooltip(method) {
  switch (method) {
    case 'icmp': return 'Measured via ICMP ping';
    case 'udp': return 'Measured via UDP Steam query';
    case 'blocked': return 'Server blocks probes but is a known Valve IP';
    case 'none': return 'Server did not respond and is not a known Valve IP';
    default: return '';
  }
}

// ============================================
// MAIN SERVER LIST COMPONENT
// ============================================
function ServerList({ servers, isUpdating, mode }) {
  const [filter, setFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default'); // default = backend sort

  // Filter servers
  let filteredServers = [...servers];
  
  if (filter !== 'all') {
    filteredServers = filteredServers.filter(s => s.region === filter);
  }
  
  if (methodFilter !== 'all') {
    filteredServers = filteredServers.filter(s => s.method === methodFilter);
  }

  // Sort (only if not default)
  if (sortBy === 'name') {
    filteredServers.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'region') {
    filteredServers.sort((a, b) => a.region.localeCompare(b.region));
  }
  // 'default' keeps backend sort: measured (asc) -> blocked -> offline

  // Get unique regions and methods
  const regions = [...new Set(servers.map(s => s.region))];
  const methods = [...new Set(servers.map(s => s.method))];

  // Stats
  const measuredCount = filteredServers.filter(s => s.time !== null).length;
  const blockedCount = filteredServers.filter(s => s.method === 'blocked').length;
  const offlineCount = filteredServers.filter(s => s.method === 'none').length;

  if (servers.length === 0) {
    return <div className="no-data glass">No server data available</div>;
  }

  return (
    <div className="server-list-container">
      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">Region:</span>
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {regions.map(region => (
            <button
              key={region}
              className={`filter-btn ${filter === region ? 'active' : ''}`}
              onClick={() => setFilter(region)}
            >
              {getRegionLabel(region)}
            </button>
          ))}
        </div>
        
        <div className="filter-group">
          <span className="filter-label">Method:</span>
          <button 
            className={`filter-btn small ${methodFilter === 'all' ? 'active' : ''}`}
            onClick={() => setMethodFilter('all')}
          >
            All
          </button>
          {methods.map(method => (
            <button
              key={method}
              className={`filter-btn small method-${method} ${methodFilter === method ? 'active' : ''}`}
              onClick={() => setMethodFilter(method)}
            >
              {method.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-label">Sort:</span>
          <select 
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="default">By Latency</option>
            <option value="name">By Name</option>
            <option value="region">By Region</option>
          </select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <span className="qs-item measured">📊 {measuredCount} Measured</span>
        <span className="qs-item blocked">🔒 {blockedCount} Blocked</span>
        <span className="qs-item offline">⚫ {offlineCount} Offline</span>
      </div>

      {/* Server List */}
      <div className="server-list">
        {filteredServers.map((server, index) => (
          <ServerCard 
            key={`${server.host}-${index}`}
            server={server} 
            rank={index + 1}
            isUpdating={isUpdating}
            isBest={index === 0 && server.time !== null && filter === 'all' && methodFilter === 'all' && sortBy === 'default'}
          />
        ))}
      </div>

      {/* No results */}
      {filteredServers.length === 0 && (
        <div className="no-results glass">
          <p>No servers match your filters</p>
          <button 
            className="btn-clear-filters"
            onClick={() => { setFilter('all'); setMethodFilter('all'); }}
          >
            Clear Filters
          </button>
        </div>
      )}
      
      {/* Update Overlay */}
      {isUpdating && (
        <div className="update-overlay">
          <div className="update-content">
            <div className="loading-spinner small"></div>
            <span>Updating...</span>
          </div>
        </div>
      )}

      {/* Mode explanation */}
      <div className="mode-explanation glass">
        <p>
          <strong>📊 Measured:</strong> Real ICMP/UDP response received<br/>
          <strong>🔒 Blocked:</strong> Known Valve IP, but blocks probes (no fake ping shown)<br/>
          <strong>⚫ Offline:</strong> No response and not a known Valve IP
        </p>
      </div>
    </div>
  );
}

export default ServerList;
