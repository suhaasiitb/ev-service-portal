/**
 * Technician Shift Timings & Adherence Utilities
 * Standard 10-hour shifts with +/- 30 minutes grace window for check-in.
 */

export const STANDARD_SHIFTS = [
    { id: "08:00 - 18:00", label: "08:00 AM - 06:00 PM (10 hrs)", start: "08:00", end: "18:00" },
    { id: "10:00 - 20:00", label: "10:00 AM - 08:00 PM (10 hrs)", start: "10:00", end: "20:00" },
    { id: "12:00 - 22:00", label: "12:00 PM - 10:00 PM (10 hrs)", start: "12:00", end: "22:00" },
];

export const DEFAULT_SHIFT = "08:00 - 18:00";

/**
 * Extracts assigned shift string from technician profile.
 * Checks:
 * 1. tech.shift_timing
 * 2. Embedded in tech.role (e.g. "technician:shift=10:00-20:00")
 * 3. Local storage fallback
 * 4. Default: "08:00 - 18:00"
 */
export function getTechnicianShift(tech) {
    if (!tech) return DEFAULT_SHIFT;

    // 1. Direct column if exists
    if (tech.shift_timing) {
        return tech.shift_timing;
    }

    // 2. Parsed from role string
    if (tech.role && typeof tech.role === "string" && tech.role.includes("shift=")) {
        const match = tech.role.match(/shift=([0-9]{2}:[0-9]{2}\s*-\s*[0-9]{2}:[0-9]{2})/i);
        if (match && match[1]) {
            return match[1].replace(/\s+/g, " ");
        }
    }

    // 3. LocalStorage fallback
    try {
        if (typeof window !== "undefined" && tech.id) {
            const saved = localStorage.getItem(`tech_shift_${tech.id}`);
            if (saved) return saved;
        }
    } catch (e) {
        // ignore
    }

    return DEFAULT_SHIFT;
}

/**
 * Parse a shift timing string like "08:00 - 18:00" into start and end parts.
 */
export function parseShiftTiming(shiftTimingStr) {
    const raw = shiftTimingStr || DEFAULT_SHIFT;
    const parts = raw.split("-").map(p => p.trim());
    const start = parts[0] || "08:00";
    const end = parts[1] || "18:00";
    return { start, end };
}

/**
 * Formats time string or 24-hr string "08:00" to readable "08:00 AM"
 */
export function formatTime12Hr(time24) {
    if (!time24) return "-";
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    if (isNaN(h)) return time24;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return `${h < 10 ? "0" + h : h}:${m} ${ampm}`;
}

/**
 * Evaluates Check-In adherence against scheduled shift.
 * Allowed: Within +/- 30 minutes of shift start.
 * If logged earlier than start - 30m => Early
 * If logged within [start - 30m, start + 30m] => On-Time (+/- 30 min window allowed)
 * If logged after start + 30m => Late
 */
export function evaluateCheckInAdherence(checkInTimeStr, shiftTimingStr, checkInDateStr) {
    if (!checkInTimeStr) return { status: "not_logged", label: "Not Logged", color: "gray" };

    const checkInDate = new Date(checkInTimeStr);
    const { start } = parseShiftTiming(shiftTimingStr);

    const [startH, startM] = start.split(":").map(Number);

    // Construct scheduled start Date for check-in date
    const scheduledStart = new Date(checkInDate);
    scheduledStart.setHours(startH, startM, 0, 0);

    // Difference in minutes between actual check-in and scheduled start
    const diffMinutes = Math.round((checkInDate - scheduledStart) / (1000 * 60));

    if (diffMinutes < -30) {
        return {
            status: "early",
            label: `Early (${Math.abs(diffMinutes)}m early)`,
            diffMinutes,
            color: "blue",
            isCompliant: true,
            badgeClass: "bg-blue-100 text-blue-800 border-blue-200"
        };
    } else if (diffMinutes <= 30) {
        return {
            status: "on_time",
            label: "On Time (Within ±30m)",
            diffMinutes,
            color: "green",
            isCompliant: true,
            badgeClass: "bg-green-100 text-green-800 border-green-200"
        };
    } else {
        return {
            status: "late",
            label: `Late by ${diffMinutes}m`,
            diffMinutes,
            color: "rose",
            isCompliant: false,
            badgeClass: "bg-rose-100 text-rose-800 border-rose-200"
        };
    }
}

/**
 * Evaluates Shift Duration / 10 Hours Completion by check out time.
 * Target: 10 hours (600 minutes).
 */
export function evaluateShiftDuration(checkInTimeStr, checkOutTimeStr) {
    if (!checkInTimeStr) {
        return {
            hours: 0,
            minutes: 0,
            totalMinutes: 0,
            formattedDuration: "0h 0m",
            hasCompleted10Hours: false,
            statusLabel: "Not Started",
            badgeClass: "bg-gray-100 text-gray-500 border-gray-200"
        };
    }

    const checkIn = new Date(checkInTimeStr);
    const checkOut = checkOutTimeStr ? new Date(checkOutTimeStr) : new Date();

    const diffMs = Math.max(0, checkOut - checkIn);
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const decimalHours = parseFloat((totalMinutes / 60).toFixed(2));

    const TARGET_MINUTES = 10 * 60; // 600 minutes = 10 hours
    const hasCompleted10Hours = totalMinutes >= TARGET_MINUTES;

    const formattedDuration = `${hours}h ${minutes}m`;

    if (!checkOutTimeStr) {
        return {
            hours,
            minutes,
            totalMinutes,
            decimalHours,
            formattedDuration,
            hasCompleted10Hours,
            isOngoing: true,
            statusLabel: hasCompleted10Hours ? "10h Target Met (Ongoing)" : `${formattedDuration} (In Progress)`,
            badgeClass: hasCompleted10Hours 
                ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                : "bg-purple-100 text-purple-800 border-purple-200"
        };
    }

    if (hasCompleted10Hours) {
        return {
            hours,
            minutes,
            totalMinutes,
            decimalHours,
            formattedDuration,
            hasCompleted10Hours: true,
            isOngoing: false,
            statusLabel: `Completed 10h Shift (${formattedDuration})`,
            badgeClass: "bg-green-100 text-green-800 border-green-200"
        };
    } else {
        const shortMinutes = TARGET_MINUTES - totalMinutes;
        const shortH = Math.floor(shortMinutes / 60);
        const shortM = shortMinutes % 60;
        return {
            hours,
            minutes,
            totalMinutes,
            decimalHours,
            formattedDuration,
            hasCompleted10Hours: false,
            isOngoing: false,
            statusLabel: `Short by ${shortH > 0 ? `${shortH}h ` : ''}${shortM}m (${formattedDuration})`,
            badgeClass: "bg-amber-100 text-amber-800 border-amber-200"
        };
    }
}
