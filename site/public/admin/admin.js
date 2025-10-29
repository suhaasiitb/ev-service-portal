cat > site/public/admin/admin.js <<'JS'
/*
  Lightweight admin.js that:
  - fetches tickets via Apps Script API (POST with action:getTickets)
  - displays counts and recent tickets
  This is a minimal starter — we'll expand with auth and actions later.
*/

const BASE = "https://script.google.com/macros/s/AKfycbxkIHrKrHvnlcJyNELLPTVl4XD1jecqRnkjEog9jyF9Ngvb60pxq8aTlT5C7eJY60tM4w/exec";

// utility: POST wrapper
async function api(action, payload = {}) {
  try {
    const r = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload })
    });
    return r.ok ? await r.json() : { ok:false, error: 'network error' };
  } catch (err) {
    return { ok:false, error: String(err) };
  }
}

async function load() {
  // Show loader placeholders
  document.getElementById('openCount').textContent = '...';
  document.getElementById('inProgressCount').textContent = '...';
  document.getElementById('closedCount').textContent = '...';
  document.getElementById('tickets').innerHTML = '<div class="py-4 text-sm text-gray-500">loading...</div>';

  // Example action name: your Apps Script must respond to action: 'getTicketsSummary'
  // For now we call 'getTickets' — adjust on server if needed.
  const res = await api('getTickets', { limit: 20 });

  if (!res || !res.ok) {
    document.getElementById('tickets').innerHTML = '<div class="py-4 text-sm text-red-600">Failed to load tickets: ' + (res.error || 'unknown') + '</div>';
    return;
  }

  // Expected res.payload to contain an array: tickets: [{ticket_id, bike_no, issue_summary, status, raised_on, station_id}]
  const tickets = res.payload && Array.isArray(res.payload.tickets) ? res.payload.tickets : [];

  const openCount = tickets.filter(t => t.status === 'Open').length;
  const inProgressCount = tickets.filter(t => t.status === 'In-Progress').length;
  const closedCount = tickets.filter(t => t.status === 'Closed').length;

  document.getElementById('openCount').textContent = openCount;
  document.getElementById('inProgressCount').textContent = inProgressCount;
  document.getElementById('closedCount').textContent = closedCount;

  const el = document.getElementById('tickets');
  if (tickets.length === 0) {
    el.innerHTML = '<div class="py-4 text-sm text-gray-500">No recent tickets</div>';
    return;
  }

  el.innerHTML = tickets.map(t => {
    const raised = new Date(t.raised_on || t.date || Date.now()).toLocaleString();
    return `
      <div class="py-3 px-2 flex items-start gap-4">
        <div class="w-2/12 text-sm font-medium">${t.bike_no || '-'}</div>
        <div class="w-6/12 text-sm">
          <div class="font-medium">${t.issue_summary || '—'}</div>
          <div class="text-xs text-gray-500">Raised: ${raised} • Station: ${t.station_id || '-'}</div>
        </div>
        <div class="w-2/12 text-sm">${t.assigned_engineer || '-'}</div>
        <div class="w-2/12 text-sm text-right">${t.status || '—'}</div>
      </div>
    `;
  }).join('');
}

document.getElementById('refreshBtn').addEventListener('click', load);
document.getElementById('filter').addEventListener('input', (e) => {
  // simple local filter later — for now reload
  load();
});

// initial load
load();
JS
