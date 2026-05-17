import { Counter, Tag } from './types';

export const isOverdue = (c: Counter) => {
    if (c.type !== 'repeating' || c.frequency === null || c.last_performed_at === null) return false;
    if (c.overdue === null) return false;
    const last = new Date(c.last_performed_at).getTime();
    return (last + (c.frequency * 1000) + (c.overdue * 1000)) < Date.now();
};

export interface FilterOptions {
    viewMode: 'counters' | 'tasks';
    showArchived: boolean;
    searchQuery: string;
    nameSort: 'asc' | 'desc' | null;
    valueSort: 'asc' | 'desc' | null;
    counterTags: Record<number, string[]>;
    allTags: Tag[];
    tagFocusMode: Record<string, boolean>;
}

export const filterAndSortCounters = (
    counters: Counter[],
    updates: any[],
    options: FilterOptions
) => {
    const { viewMode, showArchived, searchQuery, nameSort, valueSort, counterTags, allTags, tagFocusMode } = options;
    let result: Counter[] = [];

    if (viewMode === 'counters') {
        const allCounters = counters.filter(c => c.type === 'standard');

        // MRU map for secondary sorting
        const lastUsedMap = new Map<number, number>();
        updates.forEach((u, index) => {
            lastUsedMap.set(u.counter, index);
        });

        const sorted = [...allCounters].sort((a, b) => {
            // Primary Sort: Name
            if (nameSort !== null) {
                const nameComp = a.name.localeCompare(b.name);
                if (nameComp !== 0) return nameSort === 'asc' ? nameComp : -nameComp;
            }
            // Primary Sort: Count
            if (valueSort !== null) {
                const countComp = a.count - b.count;
                if (countComp !== 0) return valueSort === 'asc' ? countComp : -countComp;
            }
            // Secondary Sort: MRU
            const aLastUsed = lastUsedMap.get(a.id) ?? -1;
            const bLastUsed = lastUsedMap.get(b.id) ?? -1;
            return bLastUsed - aLastUsed;
        });

        const nonArchived = sorted.filter(c => c.archivetime === null);
        const archived = sorted.filter(c => c.archivetime !== null);

        result = showArchived ? [...nonArchived, ...archived] : nonArchived;
    } else {
        const activeCounters = counters.filter(c => c.type === 'repeating' && c.archivetime === null);

        const sorted = [...activeCounters].sort((a, b) => {
            const aOverdue = isOverdue(a);
            const bOverdue = isOverdue(b);
            if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

            // Primary Sort: Name
            if (nameSort !== null) {
                const nameComp = a.name.localeCompare(b.name);
                if (nameComp !== 0) return nameSort === 'asc' ? nameComp : -nameComp;
            }
            // Primary Sort: Count
            if (valueSort !== null) {
                const countComp = a.count - b.count;
                if (countComp !== 0) return valueSort === 'asc' ? countComp : -countComp;
            }
            // Secondary Sort: Priority (for tasks)
            return b.priority_score - a.priority_score;
        });

        const active = sorted.filter(c => c.repeat_status === 'active');

        if (showArchived) {
            const getWakeUpTime = (c: Counter) => {
                if (!c.last_performed_at || c.frequency === null) return Infinity;
                const last = new Date(c.last_performed_at).getTime();
                const freq = c.frequency;
                const alert = c.alert_window || 0;
                return last + (freq * 1000) - (alert * 1000);
            };

            const sleeping = sorted
                .filter(c => c.repeat_status === 'sleeping')
                .sort((a, b) => getWakeUpTime(a) - getWakeUpTime(b));

            const archived = counters
                .filter(c => c.type === 'repeating' && c.archivetime !== null)
                .sort((a, b) => b.priority_score - a.priority_score);

            result = [...active, ...sleeping, ...archived];
        } else {
            result = active;
        }
    }

    // Apply search filter, with focus_mode logic
    const query = searchQuery.toLowerCase();
    const focusTagNames = new Set(allTags.filter(t => tagFocusMode[t.name]).map(t => t.name.toLowerCase()));

    return result.filter(c => {
        if (c.type === 'repeating' && isOverdue(c)) {
            if (!query) return true;
            const tags = counterTags[c.id] || [];
            const nameMatch = c.name.toLowerCase().includes(query);
            const tagMatch = tags.some(tag => tag.toLowerCase().includes(query));
            return nameMatch || tagMatch;
        }

        const tags = counterTags[c.id] || [];
        const focusTags = tags.filter(t => focusTagNames.has(t.toLowerCase()));
        if (focusTags.length > 0) {
            return focusTags.some(t => t.toLowerCase() === query);
        }
        if (!query) return true;
        const isGlobalExactTagMatch = allTags.some(tag => tag.name.toLowerCase() === query);
        if (isGlobalExactTagMatch) {
            return tags.some(tag => tag.toLowerCase() === query);
        }
        const nameMatch = c.name.toLowerCase().includes(query);
        const tagMatch = tags.some(tag => tag.toLowerCase().includes(query));
        return nameMatch || tagMatch;
    });
};
