const BASE =
  "https://script.google.com/macros/s/AKfycbxkIHrKrHvnlcJyNELLPTVl4XD1jecqRnkjEog9jyF9Ngvb60pxq8aTlT5C7eJY60tM4w/exec";

async function api(action, payload = {}) {
  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    return res.ok ? await res.json() : { ok: false, error: "Network error" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function loadTickets() {
  document.getElementById("tickets").innerHTML =
    '<div class="py-4 text-sm text-gray-500">Loading...</div>';

  const res = await api("getTickets", { limit: 50 });
  if (!res.ok) {
    document.getElementById("tickets").innerHTML =
      '<div class="py-4 text-sm text-red-600">Failed to load: ' +
      (res.error || "Unknown error") +
      "</div>";
    return;
  }

  const tickets = res.payload?.tickets || [];
  const open = tickets.filter((t) => t.status === "Open").length;
  const prog = tickets.filter((t) => t.status === "In-Progress").length;
  const closed = tickets.filter((t) => t.status === "Closed").length;

  document.getElementById("openCount").textContent = open;
  document.getElementById("inProgressCount").textContent = prog;
  document.getElementById("closedCount").textContent = closed;

  const rows = tickets
    .map((t) => {
      const date = new Date(t.raised_on || Date.now()).toLocaleString();
      return `
        <div class="py-3 px-2 flex items-start gap-4 hover:bg-gray-50 transition">
          <div class="w-2/12 font-medium text-sm">${t.bike_no || "-"}</div>
          <div class="w-5/12 text-sm">
            <div>${t.issue_summary || "—"}</div>
            <div class="text-xs text-gray-500">${date}</div>
          </div>
          <div class="w-3/12 text-sm">${t.assigned_engineer || "-"}</div>
          <div class="w-2/12 text-right text-sm font-medium">${t.status}</div>
        </div>`;
    })
    .join("");

  document.getElementById("tickets").innerHTML =
    rows || '<div class="py-4 text-sm text-gray-500">No tickets</div>';
}

document
  .getElementById("refreshBtn")
  .addEventListener("click", loadTickets);

window.addEventListener("DOMContentLoaded", loadTickets);
