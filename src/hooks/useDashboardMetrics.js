import { useMemo } from "react";

export function useDashboardMetrics(tickets, walkins) {
  const today = new Date().toISOString().split("T")[0];

  // -------------------------
  // Walk-In Metrics
  // -------------------------
  const walkInMetrics = useMemo(() => {
    const todayWalkIns = walkins.filter((w) =>
      w.logged_at?.startsWith(today)
    );

    const weekWalkIns = walkins.filter((w) => {
      if (!w.logged_at) return false;
      const d = new Date(w.logged_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    });

    return {
      today: todayWalkIns.length,
      week: weekWalkIns.length,
    };
  }, [walkins, today]);

  // -------------------------
  // Ticket + Engineer Metrics
  // -------------------------
  const ticketMetrics = useMemo(() => {
    const todayTickets = tickets.filter((t) =>
      t.reported_at?.startsWith(today)
    );

    const todayClosed = tickets.filter(
      (t) => t.closed_at && t.closed_at.startsWith(today)
    );

    const openNow = tickets.filter((t) => t.status === "open");

    // ---- AVG TAT (minutes) ----
    const avgTAT =
      todayClosed.length > 0
        ? (
            todayClosed.reduce((sum, t) => {
              const start = new Date(t.reported_at);
              const end = new Date(t.closed_at);
              return sum + (end - start) / 60000;
            }, 0) / todayClosed.length
          ).toFixed(1)
        : 0;

    // ---- Engineer performance (last 7 days) ----
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const engMap = {};

    tickets.forEach((t) => {
      if (!t.closed_by || !t.closed_at) return;

      const closedAt = new Date(t.closed_at);
      if (closedAt < sevenDaysAgo) return;

      if (!engMap[t.closed_by]) {
        engMap[t.closed_by] = { tickets: 1, walkins: 0 };
      } else {
        engMap[t.closed_by].tickets++;
      }
    });

    walkins.forEach((w) => {
      if (!w.engineer_id || !w.logged_at) return;

      const loggedAt = new Date(w.logged_at);
      if (loggedAt < sevenDaysAgo) return;

      if (!engMap[w.engineer_id]) {
        engMap[w.engineer_id] = { tickets: 0, walkins: 1 };
      } else {
        engMap[w.engineer_id].walkins++;
      }
    });

    return {
      totalToday: todayTickets.length,
      closedToday: todayClosed.length,
      openNow: openNow.length,
      avgTAT,
      engineerPerformance: engMap,
    };
  }, [tickets, walkins, today]);

  return {
    walkInMetrics,
    ticketMetrics,
  };
}
