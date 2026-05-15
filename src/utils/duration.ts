/**
 * Parses a duration string and converts it to seconds.
 * Supports:
 * - Seconds as number: "540"
 * - HH:MM:SS or MM:SS: "1:30:00", "1:30"
 * - Natural language/shorthand: "1h 30m", "90 minutes", "1.5 hours", "1h30m"
 *
 * @param input The duration string to parse
 * @returns The duration in seconds, or null if parsing fails
 */
export function parseDurationToSeconds(input: string): number | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // 1. Handle plain numbers
    if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
    }

    // 2. Handle HH:MM:SS or MM:SS
    const timeMatch = trimmed.match(/^(\d+):(\d+)(?::(\d+))?$/);
    if (timeMatch) {
        const parts = timeMatch.slice(1).map(p => parseInt(p || '0', 10));

        const colonCount = (trimmed.match(/:/g) || []).length;
        if (colonCount === 2) {
            const [h, m, s] = parts;
            return h * 3600 + m * 60 + s;
        } else if (colonCount === 1) {
            const [m, s] = parts;
            return m * 60 + s;
        }
    }

    // 3. Handle natural language / shorthand: "1h 30m", "90 minutes", "1.5 hours"
    const unitMap: Record<string, number> = {
        's': 1, 'sec': 1, 'seconds': 1, 'second': 1,
        'm': 60, 'min': 60, 'minutes': 60, 'minute': 60,
        'h': 3600, 'hr': 3600, 'hours': 3600, 'hour': 3600,
        'd': 86400, 'day': 86400, 'days': 86400,
        'w': 604800, 'week': 604800, 'weeks': 604800,
        'mo': 2592000, 'month': 2592000, 'months': 2592000,
    };

    const regex = /(\d+(\.\d+)?)\s*([a-zA-Z]+)/g;
    let totalSeconds = 0;
    let matchFound = false;
    let match;

    while ((match = regex.exec(trimmed)) !== null) {
        matchFound = true;
        const value = parseFloat(match[1]);
        const unit = match[3].toLowerCase();
        const multiplier = unitMap[unit];

        if (multiplier === undefined) return null; // Unknown unit
        totalSeconds += value * multiplier;
    }

    return matchFound ? Math.round(totalSeconds) : null;
}

/**
 * Converts seconds into a compact, human-readable duration string.
 * Format: "1mo 2w 3d 4h 5m 6s"
 *
 * @param seconds The duration in seconds
 * @returns A formatted duration string
 */
export function formatSecondsToDuration(seconds: number): string {
    if (seconds === 0) return '0s';
    if (isNaN(seconds)) return '0s';

    const units = [
        { label: 'mo', value: 2592000 },
        { label: 'w', value: 604800 },
        { label: 'd', value: 86400 },
        { label: 'h', value: 3600 },
        { label: 'm', value: 60 },
        { label: 's', value: 1 },
    ];

    let remaining = seconds;
    const parts: string[] = [];

    for (const unit of units) {
        const count = Math.floor(remaining / unit.value);
        if (count > 0) {
            parts.push(`${count}${unit.label}`);
            remaining %= unit.value;
        }
    }

    return parts.join(' ');
}
