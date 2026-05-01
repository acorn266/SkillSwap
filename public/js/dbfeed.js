// Database Activity Feed — shows which DB was hit for each action
const DB_COLORS = {
  postgres: { color: '#3b82f6', label: 'PostgreSQL', icon: '🐘' },
  neo4j:    { color: '#7c3aed', label: 'Neo4j',      icon: '🕸️' },
  couchdb:  { color: '#10b981', label: 'CouchDB',    icon: '🛋️' },
  redis:    { color: '#ef4444', label: 'Redis',       icon: '⚡' },
};

let feedVisible = false;
let feedEntries = [];

function initDBFeed() {
  // Create feed UI
  const feed = document.createElement('div');
  feed.id = 'db-feed';
  feed.innerHTML = `
    <div id="db-feed-header">
      <span>🗄️ DB Activity Feed</span>
      <button onclick="clearFeed()" style="background:none;border:none;cursor:pointer;color:inherit;font-size:0.8rem;opacity:0.7;">Clear</button>
    </div>
    <div id="db-feed-body"></div>
  `;
  document.body.appendChild(feed);

  // Toggle button
  const btn = document.createElement('button');
  btn.id = 'db-feed-toggle';
  btn.innerHTML = '🗄️ DB Feed';
  btn.onclick = toggleFeed;
  document.body.appendChild(btn);

  // CSS
  const style = document.createElement('style');
  style.textContent = `
    #db-feed-toggle {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      padding: 8px 14px;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      font-family: inherit;
      transition: all 0.2s;
    }
    #db-feed-toggle:hover {
      border-color: var(--accent);
      color: var(--accent);
      transform: translateY(-1px);
    }
    #db-feed {
      position: fixed;
      bottom: 4rem;
      right: 1.5rem;
      width: 320px;
      max-height: 420px;
      background: var(--surface);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      z-index: 9998;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: inherit;
    }
    #db-feed.open { display: flex; animation: feedIn 0.2s ease; }
    @keyframes feedIn {
      from { opacity:0; transform: translateY(8px) scale(0.97); }
      to   { opacity:1; transform: translateY(0) scale(1); }
    }
    #db-feed-header {
      padding: 0.75rem 1rem;
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-primary);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #db-feed-body {
      overflow-y: auto;
      flex: 1;
      padding: 0.5rem 0;
    }
    .feed-entry {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid var(--border);
      animation: entryIn 0.2s ease;
    }
    @keyframes entryIn {
      from { opacity:0; transform: translateX(8px); }
      to   { opacity:1; transform: translateX(0); }
    }
    .feed-entry:last-child { border-bottom: none; }
    .feed-db-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      margin-top: 5px;
      flex-shrink: 0;
    }
    .feed-content { flex: 1; }
    .feed-db-name {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .feed-action {
      font-size: 0.78rem;
      color: var(--text-secondary);
      margin-top: 1px;
    }
    .feed-time {
      font-size: 0.68rem;
      color: var(--text-muted);
      margin-top: 2px;
    }
    #db-feed-body:empty::after {
      content: 'No activity yet. Interact with the app!';
      display: block;
      padding: 1.5rem 1rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      text-align: center;
      font-style: italic;
    }
  `;
  document.head.appendChild(style);
}

function toggleFeed() {
  feedVisible = !feedVisible;
  const feed = document.getElementById('db-feed');
  const btn = document.getElementById('db-feed-toggle');
  if (feedVisible) {
    feed.classList.add('open');
    btn.style.color = 'var(--accent)';
    btn.style.borderColor = 'var(--accent)';
  } else {
    feed.classList.remove('open');
    btn.style.color = '';
    btn.style.borderColor = '';
  }
}

function logDB(db, action) {
  const info = DB_COLORS[db];
  if (!info) return;

  const now = new Date();
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const body = document.getElementById('db-feed-body');
  if (!body) return;

  const entry = document.createElement('div');
  entry.className = 'feed-entry';
  entry.innerHTML = `
    <div class="feed-db-dot" style="background:${info.color};box-shadow:0 0 6px ${info.color}55;"></div>
    <div class="feed-content">
      <div class="feed-db-name" style="color:${info.color};">${info.icon} ${info.label}</div>
      <div class="feed-action">${action}</div>
      <div class="feed-time">${time}</div>
    </div>
  `;

  body.insertBefore(entry, body.firstChild);

  // Keep max 20 entries
  while (body.children.length > 20) {
    body.removeChild(body.lastChild);
  }
}

function clearFeed() {
  const body = document.getElementById('db-feed-body');
  if (body) body.innerHTML = '';
}

// Auto-init
document.addEventListener('DOMContentLoaded', initDBFeed);