const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
];

let currentPeriod = 'today';
let refreshTimer = null;

function getConfig() {
  return window.LEADERBOARD_CONFIG || {};
}

function getTodayBounds() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset),
  );
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function formatLocation(entry) {
  if (entry.location_precision === 'city' && entry.city_label && entry.region_label) {
    return `${entry.city_label}, ${entry.region_label}`;
  }
  if (entry.location_precision === 'region' && entry.region_label) {
    const country = COUNTRIES.find((c) => c.code === entry.country_code);
    return `${entry.region_label}${country ? `, ${country.name}` : ''}`;
  }
  if (entry.location_precision === 'country' && entry.country_code) {
    const country = COUNTRIES.find((c) => c.code === entry.country_code);
    return country?.name || entry.country_code;
  }
  return '—';
}

function formatIU(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatMinutes(m) {
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
  }
  return `${m}m`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `Updated ${hrs}h ago`;
}

function renderRows(entries) {
  const body = document.getElementById('leaderboard-body');
  if (!entries.length) {
    body.innerHTML = '<div class="empty">No sessions yet. Be the first to touch grass.</div>';
    document.getElementById('stat-players').textContent = '0';
    document.getElementById('stat-iu').textContent = '—';
    document.getElementById('stat-minutes').textContent = '—';
    return;
  }

  document.getElementById('stat-players').textContent = String(entries.length);
  document.getElementById('stat-iu').textContent = formatIU(entries[0].total_iu);
  document.getElementById('stat-minutes').textContent = formatMinutes(entries[0].total_sun_minutes);

  body.innerHTML = entries
    .map((entry) => {
      const rankClass =
        entry.rank === 1 ? 'rank-1' : entry.rank === 2 ? 'rank-2' : entry.rank === 3 ? 'rank-3' : '';
      const rowClass =
        entry.rank === 1 ? 'top-1' : entry.rank === 2 ? 'top-2' : entry.rank === 3 ? 'top-3' : '';
      return `
        <div class="table-row ${rowClass}">
          <span class="rank ${rankClass}">${entry.rank}</span>
          <span class="name">${escapeHtml(entry.anonymous_name)}</span>
          <span class="location">${escapeHtml(formatLocation(entry))}</span>
          <span class="sun">${formatMinutes(Number(entry.total_sun_minutes))}</span>
          <span class="iu">${formatIU(Number(entry.total_iu))}</span>
        </div>
      `;
    })
    .join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchLeaderboard() {
  const config = getConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    document.getElementById('leaderboard-body').innerHTML =
      '<div class="error">Supabase not configured. Copy config.example.js to config.js.</div>';
    return;
  }

  const supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const bounds = currentPeriod === 'today' ? getTodayBounds() : getWeekBounds();
  const countryCode = document.getElementById('country-filter').value || null;

  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_start: bounds.start,
    p_end: bounds.end,
    p_limit: 50,
    p_country_code: countryCode,
  });

  if (error) {
    document.getElementById('leaderboard-body').innerHTML =
      `<div class="error">Failed to load: ${escapeHtml(error.message)}</div>`;
    return;
  }

  renderRows(data || []);
  const latest = data?.[0]?.last_updated_at;
  document.getElementById('last-updated').textContent = timeAgo(latest);
}

function initCountryFilter() {
  const select = document.getElementById('country-filter');
  COUNTRIES.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => fetchLeaderboard());
}

function initTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentPeriod = tab.dataset.period;
      fetchLeaderboard();
    });
  });
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(fetchLeaderboard, 60_000);
}

document.addEventListener('DOMContentLoaded', () => {
  initCountryFilter();
  initTabs();
  fetchLeaderboard();
  startAutoRefresh();
});
