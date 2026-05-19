import React, { useEffect, useState } from 'react';
import { Counter, Tag } from '../types';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { RecentActivityTable, Count } from '../components/RecentActivityTable';
import { StatsSummary } from '../components/StatsSummary';
import { api } from '../services/api';
import { useStats, TimeScope, GraphMode } from '../hooks/useStats';
import { StatsChart } from '../components/StatsChart';
import { StatsControls } from '../components/StatsControls';
import { TagCounterSelector } from '../components/TagCounterSelector';

interface StatisticsPageProps {
    refreshTrigger?: number;
}

export const StatisticsPage: React.FC<StatisticsPageProps> = ({ refreshTrigger }) => {
    const [counters, setCounters] = useState<Counter[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [tagCountersMap, setTagCountersMap] = useState<Map<number, number[]>>(new Map());
    const [allCounts, setAllCounts] = useState<Count[]>([]);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [countToDelete, setCountToDelete] = useState<number | null>(null);
    const [countToEdit, setCountToEdit] = useState<{ id: number; when: string } | null>(null);
    const [editWhen, setEditWhen] = useState('');

    const {
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
    } = useStats(allCounts, counters, tagCountersMap);

    const setCurrentScope = (scope: TimeScope) => {
        if (graphMode === 'frequency') {
            setFrequencyTimeScope(scope);
        } else {
            setTimelineTimeScope(scope);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [countersData, countsData, accountData, tagsData] = await Promise.all([
                    api.getCounters(),
                    api.getCounts(),
                    api.getAccount(),
                    api.getTags()
                ]);

                setCurrentUserEmail(accountData.email);

                // Fetch counters for each tag
                const tagMap = new Map<number, number[]>();
                await Promise.all(tagsData.map(async (tag) => {
                    const counterIds = await api.getCountersForTag(tag.id);
                    tagMap.set(tag.id, counterIds);
                }));
                setTags(tagsData);
                setTagCountersMap(tagMap);

                const lastUsedMap = new Map<number, number>();
                countsData.forEach((count, index) => {
                    lastUsedMap.set(count.counter, index);
                });

                const sortedCounters = countersData
                    .filter(c => c.archivetime === null)
                    .sort((a, b) => {
                        const aLastUsed = lastUsedMap.get(a.id) ?? -1;
                        const bLastUsed = lastUsedMap.get(b.id) ?? -1;
                        return bLastUsed - aLastUsed;
                    });

                setCounters(sortedCounters);
                setAllCounts(countsData);

                if (selectedCounterId === null && selectedTagId === null && sortedCounters.length > 0) {
                    setSelectedCounterId(sortedCounters[0].id);
                } else if (selectedCounterId !== null && !sortedCounters.some(c => c.id === selectedCounterId)) {
                    if (sortedCounters.length > 0) {
                        setSelectedCounterId(sortedCounters[0].id);
                    } else {
                        setSelectedCounterId(null);
                    }
                }
            } catch (e) {
                console.error('Error loading stats', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [refreshTrigger]);

    const handleUpdateTimestamp = async () => {
        if (!countToEdit) return;
        try {
            // Note: we need a PUT endpoint for counts. 
            // The api.ts doesn't have updateCountTimestamp, so we use fetch or add it.
            await fetch(`/api/counts/${countToEdit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ when: new Date(editWhen).toISOString() }),
            });

            const countsData = await api.getCounts();
            setAllCounts(countsData);
            setCountToEdit(null);
        } catch (e) {
            console.error('Error updating timestamp', e);
        }
    };

    const formatForInput = (dateStr: string) => {
        const date = new Date(dateStr);
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
        return localISOTime;
    };

    if (loading) return <div className="stats-page">Loading...</div>;

    return (
        <div className="stats-page">
            <div className="stats-container">
                {selectedCounterId !== null || selectedTagId !== null ? (
                    <>
                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <h1 style={{ textAlign: 'center', margin: 0, fontSize: '1.5rem' }}>Statistics</h1>
                            <StatsControls 
                                graphMode={graphMode} 
                                setGraphMode={setGraphMode} 
                                currentScope={currentScope} 
                                setCurrentScope={setCurrentScope} 
                                timelineOffset={timelineOffset}
                                setTimelineOffset={setTimelineOffset}
                            />
                        </div>
                        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <TagCounterSelector 
                                counters={counters}
                                tags={tags}
                                tagCountersMap={tagCountersMap}
                                selectedCounterId={selectedCounterId}
                                setSelectedCounterId={setSelectedCounterId}
                                selectedTagId={selectedTagId}
                                setSelectedTagId={setSelectedTagId}
                            />
                        </div>
                        <StatsChart stats={stats} currentScope={currentScope} graphMode={graphMode} />
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            width: '100%',
                            maxWidth: '600px',
                            margin: '10px auto 0',
                            fontSize: '0.7rem',
                            color: '#666'
                        }}>
                            <span>{currentScope === 'Day' ? '0:00' : currentScope === 'Week' ? '7d ago' : currentScope === 'Month' ? '30d ago' : currentScope === 'YTD' ? 'Jan' : '1y ago'}</span>
                            <span>{currentScope === 'Day' ? '12:00' : currentScope === 'Week' ? '3d ago' : currentScope === 'Month' ? '15d ago' : currentScope === 'YTD' ? 'Mid' : '6m ago'}</span>
                            <span>{currentScope === 'Day' ? '23:00' : 'Now'}</span>
                        </div>

                        {countToDelete !== null && (
                            <ConfirmationModal
                                message="Do you want to delete the selected count?"
                                onConfirm={async () => {
                                    try {
                                        await api.deleteCount(countToDelete);
                                        const countsData = await api.getCounts();
                                        setAllCounts(countsData);
                                    } catch (e) {
                                        console.error('Error deleting count', e);
                                    } finally {
                                        setCountToDelete(null);
                                    }
                                }}
                                onCancel={() => setCountToDelete(null)}
                            />
                        )}

                        {countToEdit !== null && (
                            <div className="modal-overlay" style={{ zIndex: 1000 }}>
                                <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                                    <h2 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>Edit Timestamp</h2>
                                    <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                        <label style={{ fontSize: '0.9rem', color: '#666' }}>Select new time:</label>
                                        <input
                                            type="datetime-local"
                                            value={editWhen}
                                            onChange={(e) => setEditWhen(e.target.value)}
                                            style={{
                                                padding: '8px',
                                                borderRadius: '4px',
                                                border: '1px solid #ccc',
                                                fontSize: '1rem'
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                        <button
                                            onClick={() => setCountToEdit(null)}
                                            style={{
                                                padding: '10px 20px',
                                                backgroundColor: '#ccc',
                                                color: '#333',
                                                border: 'none',
                                                borderRadius: '5px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUpdateTimestamp}
                                            style={{
                                                padding: '10px 20px',
                                                backgroundColor: 'var(--color-primary)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '5px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Update
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div style={{
                            marginTop: '3rem',
                            width: '100%',
                            maxWidth: '600px',
                            margin: '3rem auto 0',
                            fontSize: '0.9rem'
                        }}>
                            <StatsSummary stats={stats} />
                            <RecentActivityTable
                                counterIds={selectedCounterId !== null 
                                   ? [selectedCounterId] 
                                   : (selectedTagId !== null ? (tagCountersMap.get(selectedTagId) || []) : [])
                               }
                                counts={allCounts}
                                currentUserEmail={currentUserEmail}
                                title="Recent Activity"
                                onDelete={(id) => setCountToDelete(id)}
                                onEdit={(id, when) => {
                                    setCountToEdit({ id, when });
                                    setEditWhen(formatForInput(when));
                                }}
                            />
                        </div>
                    </>
                ) : (
                    <h1 style={{ textAlign: 'center' }}>Statistics</h1>
                )}
            </div>
        </div>
    );
};
