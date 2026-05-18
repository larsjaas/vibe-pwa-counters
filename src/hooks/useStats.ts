import { useState, useEffect } from 'react';
import { Count } from '../components/RecentActivityTable';

export type GraphMode = 'frequency' | 'timeline';
export type TimeScope = 'Day' | 'Week' | 'Month' | 'YTD' | 'Year';

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
    stats: number[];
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

    const currentScope = graphMode === 'frequency' ? frequencyTimeScope : timelineTimeScope;

    const stats = (() => {
        if (selectedCounterId === null && selectedTagId === null) return [];
        
        const now = new Date();
        let filteredCounts: Count[] = [];
        if (selectedCounterId !== null) {
            filteredCounts = allCounts.filter(c => c.counter === selectedCounterId);
        } else if (selectedTagId !== null) {
            const tagCounters = tagCountersMap.get(selectedTagId) || [];
            filteredCounts = allCounts.filter(c => tagCounters.includes(c.counter));
        }
        
        let buckets: number[] = [];

        if (graphMode === 'frequency') {
            switch (currentScope) {
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
            switch (currentScope) {
                case 'Day': {
                    buckets = new Array(24).fill(0);
                    const todayStart = new Date(now.setHours(0,0,0,0));
                    filteredCounts.filter(c => new Date(c.when) >= todayStart)
                        .forEach(c => {
                            buckets[new Date(c.when).getHours()] += Math.abs(c.delta);
                        });
                    break;
                }
                case 'Week': {
                    buckets = new Array(7).fill(0);
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    filteredCounts.filter(c => new Date(c.when) >= weekAgo)
                        .forEach(c => {
                            const diff = Math.floor((new Date(c.when).getTime() - weekAgo.getTime()) / (24 * 60 * 60 * 1000));
                            if (diff >= 0 && diff < 7) buckets[diff] += Math.abs(c.delta);
                        });
                    break;
                }
                case 'Month': {
                    buckets = new Array(30).fill(0);
                    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    filteredCounts.filter(c => new Date(c.when) >= monthAgo)
                        .forEach(c => {
                            const diff = Math.floor((new Date(c.when).getTime() - monthAgo.getTime()) / (24 * 60 * 60 * 1000));
                            if (diff >= 0 && diff < 30) buckets[diff] += Math.abs(c.delta);
                        });
                    break;
                }
                case 'YTD': {
                    const currentYear = new Date().getFullYear();
                    const currentMonth = new Date().getMonth();
                    buckets = new Array(currentMonth + 1).fill(0);
                    const startOfYear = new Date(currentYear, 0, 1);
                    filteredCounts.filter(c => new Date(c.when) >= startOfYear)
                        .forEach(c => {
                            const m = new Date(c.when).getMonth();
                            if (m >= 0 && m <= currentMonth) buckets[m] += Math.abs(c.delta);
                        });
                    break;
                }
                case 'Year': {
                    buckets = new Array(12).fill(0);
                    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
                    filteredCounts.filter(c => new Date(c.when) >= yearAgo)
                        .forEach(c => {
                            const date = new Date(c.when);
                            const diffMonths = (date.getFullYear() - new Date().getFullYear()) * 12 + (date.getMonth() - new Date().getMonth());
                            const bucketIdx = 11 + diffMonths;
                            if (bucketIdx >= 0 && bucketIdx < 12) buckets[bucketIdx] += Math.abs(c.delta);
                        });
                    break;
                }
            }
        }
        return buckets;
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
        stats,
        currentScope
    };
};
