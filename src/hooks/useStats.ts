import { useState, useEffect } from 'react';
import { Count } from '../components/RecentActivityTable';

export type GraphMode = 'frequency' | 'timeline';
export type TimeScope = 'Day' | 'Week' | 'Month' | 'YTD' | 'Year';

export interface StatsSeries {
    name: string;
    values: number[];
}

const getBuckets = (allCounts: Count[], counterId: number, scope: TimeScope, mode: GraphMode, now: Date, offset: number = 0) => {
    const filteredCounts = allCounts.filter(c => c.counter === counterId);
    let buckets: number[] = [];

    if (mode === 'frequency') {
        switch (scope) {
            case 'Day':
                buckets = new Array(24).fill(0);
                filteredCounts.forEach(c => {
                    buckets[new Date(c.when).getHours()] += Math.abs(c.delta);
                });
                break;
            case 'Week':
                buckets = new Array(7).fill(0);
                filteredCounts.forEach(c => {
                    buckets[new Date(c.when).getDay()] += Math.abs(c.delta);
                });
                break;
            case 'Month':
                buckets = new Array(31).fill(0);
                filteredCounts.forEach(c => {
                    buckets[new Date(c.when).getDate() - 1] += Math.abs(c.delta);
                });
                break;
            case 'YTD':
            case 'Year':
                buckets = new Array(12).fill(0);
                filteredCounts.forEach(c => {
                    buckets[new Date(c.when).getMonth()] += Math.abs(c.delta);
                });
                break;
        }
    } else {
        switch (scope) {
            case 'Day': {
                buckets = new Array(24).fill(0);
                const start = new Date();
                start.setHours(0,0,0,0);
                start.setDate(start.getDate() - offset);
                const end = new Date();
                end.setHours(0,0,0,0);
                end.setDate(end.getDate() - offset + 1);
                filteredCounts.filter(c => {
                    const d = new Date(c.when);
                    return d >= start && d < end;
                }).forEach(c => {
                    buckets[new Date(c.when).getHours()] += Math.abs(c.delta);
                });
                break;
            }
            case 'Week': {
                buckets = new Array(7).fill(0);
                const end = new Date();
                end.setDate(end.getDate() - offset * 7);
                const start = new Date(end);
                start.setDate(start.getDate() - 7);
                filteredCounts.filter(c => {
                    const d = new Date(c.when);
                    return d >= start && d < end;
                }).forEach(c => {
                    const diff = Math.floor((new Date(c.when).getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
                    if (diff >= 0 && diff < 7) buckets[diff] += Math.abs(c.delta);
                });
                break;
            }
            case 'Month': {
                buckets = new Array(30).fill(0);
                const end = new Date();
                end.setMonth(end.getMonth() - offset);
                const start = new Date(end);
                start.setMonth(start.getMonth() - 1);
                filteredCounts.filter(c => {
                    const d = new Date(c.when);
                    return d >= start && d < end;
                }).forEach(c => {
                    const diff = Math.floor((new Date(c.when).getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
                    if (diff >= 0 && diff < 30) buckets[diff] += Math.abs(c.delta);
                });
                break;
            }
            case 'YTD': {
                const year = new Date().getFullYear() - offset;
                buckets = new Array(12).fill(0);
                const start = new Date(year, 0, 1);
                const end = new Date(year, 11, 31, 23, 59, 59);
                filteredCounts.filter(c => {
                    const d = new Date(c.when);
                    return d >= start && d <= end;
                }).forEach(c => {
                    buckets[new Date(c.when).getMonth()] += Math.abs(c.delta);
                });
                break;
            }
            case 'Year': {
                buckets = new Array(12).fill(0);
                const year = new Date().getFullYear() - offset - 1;
                const start = new Date(year, 0, 1);
                const end = new Date(year, 11, 31, 23, 59, 59);
                filteredCounts.filter(c => {
                    const d = new Date(c.when);
                    return d >= start && d <= end;
                }).forEach(c => {
                    buckets[new Date(c.when).getMonth()] += Math.abs(c.delta);
                });
                break;
            }
        }
    }
    return buckets;
};

interface UseStatsReturn {
    selectedCounterId: number | null;
    setSelectedCounterId: (id: number | null) => void;
    selectedTagId: number | null;
    setSelectedTagId: (id: number | null) => void;
    graphMode: GraphMode;
    setGraphMode: (mode: GraphMode) => void;
    frequencyTimeScope: TimeScope;
    setFrequencyTimeScope: (scope: TimeScope) => void;
    timelineTimeScope: TimeScope;
    setTimelineTimeScope: (scope: TimeScope) => void;
    timelineOffset: number;
    setTimelineOffset: (offset: number) => void;
    stats: StatsSeries[];
    currentScope: TimeScope;
}

export const useStats = (allCounts: Count[], counters: any[], tagCountersMap: Map<number, number[]>): UseStatsReturn => {
    const [selectedCounterId, setSelectedCounterId] = useState<number | null>(() => {
        const saved = localStorage.getItem('statsSelectedCounterId');
        return saved ? parseInt(saved, 10) : null;
    });

    const [selectedTagId, setSelectedTagId] = useState<number | null>(() => {
        const saved = localStorage.getItem('statsSelectedTagId');
        return saved ? parseInt(saved, 10) : null;
    });

    const [graphMode, setGraphMode] = useState<GraphMode>(() => {
        return (localStorage.getItem('statsGraphMode') as GraphMode) || 'frequency';
    });


    const [frequencyTimeScope, setFrequencyTimeScope] = useState<TimeScope>(() => {
        return (localStorage.getItem('statsFrequencyTimeScope') as TimeScope) || 'Day';
    });

    const [timelineTimeScope, setTimelineTimeScope] = useState<TimeScope>(() => {
        return (localStorage.getItem('statsTimelineTimeScope') as TimeScope) || 'Month';
    });

    const [timelineOffset, setTimelineOffset] = useState<number>(() => {
        const saved = localStorage.getItem('statsTimelineOffset');
        return saved ? parseInt(saved, 10) : 0;
    });

    useEffect(() => {
        if (selectedCounterId !== null) {
            localStorage.setItem('statsSelectedCounterId', selectedCounterId.toString());
        }
    }, [selectedCounterId]);

    useEffect(() => {
        if (selectedTagId !== null) {
            localStorage.setItem('statsSelectedTagId', selectedTagId.toString());
        }
    }, [selectedTagId]);

    useEffect(() => {
        localStorage.setItem('statsGraphMode', graphMode);
    }, [graphMode]);

    useEffect(() => {
        localStorage.setItem('statsFrequencyTimeScope', frequencyTimeScope);
    }, [frequencyTimeScope]);

    useEffect(() => {
        localStorage.setItem('statsTimelineTimeScope', timelineTimeScope);
    }, [timelineTimeScope]);

    useEffect(() => {
        localStorage.setItem('statsTimelineOffset', timelineOffset.toString());
    }, [timelineOffset]);

    const currentScope = graphMode === 'frequency' ? frequencyTimeScope : timelineTimeScope;

    const stats = (() => {
        if (selectedCounterId === null && selectedTagId === null) return [];
        
        const now = new Date();
        const offset = graphMode === 'timeline' ? timelineOffset : 0;
        if (selectedCounterId !== null) {
            const values = getBuckets(allCounts, selectedCounterId, currentScope, graphMode, now, offset);
            const counter = counters.find(c => c.id === selectedCounterId);
            return [{
                name: counter?.name || `Counter ${selectedCounterId}`,
                values
            }];
        } else if (selectedTagId !== null) {
            const tagCounters = tagCountersMap.get(selectedTagId) || [];
            return tagCounters.map(counterId => {
                const values = getBuckets(allCounts, counterId, currentScope, graphMode, now, offset);
                const counter = counters.find(c => c.id === counterId);
                return {
                    name: counter?.name || `Counter ${counterId}`,
                    values
                };
            });
        }
        return [];
    })();

    return {
        selectedCounterId,
        setSelectedCounterId,
        selectedTagId,
        setSelectedTagId,
        graphMode,
        setGraphMode,
        frequencyTimeScope,
        setFrequencyTimeScope,
        timelineTimeScope,
        setTimelineTimeScope,
        timelineOffset,
        setTimelineOffset,
        stats,
        currentScope
    };
};
