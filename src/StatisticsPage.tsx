import React, { useEffect, useState } from 'react';
import { Counter } from './CounterList';

export const StatisticsPage: React.FC = () => {
    const [counters, setCounters] = useState<Counter[]>([]);
    const [selectedCounterId, setSelectedCounterId] = useState<number | null>(null);
    const [stats, setStats] = useState<number[]>(new Array(24).fill(0));
    const [loading, setLoading] = useState(true);
    const [allCounts, setAllCounts] = useState<Array<{ counter: number; delta: number; when: string }>>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resCounters, resCounts] = await Promise.all([
                    fetch('/api/counters'),
                    fetch('/api/count')
                ]);

                if (!resCounters.ok || !resCounts.ok) throw new Error('Failed to fetch data');

                const countersData: Counter[] = await resCounters.json();
                const countsData: Array<{ counter: number; delta: number; when: string }> = await resCounts.json();

                // MRU Ordering: Most recently updated counters first.
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
                
                if (sortedCounters.length > 0) {
                    setSelectedCounterId(sortedCounters[0].id);
                }
            } catch (e) {
                console.error('Error loading stats', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (selectedCounterId === null) return;

        const hourBuckets = new Array(24).fill(0);
        allCounts
            .filter(c => c.counter === selectedCounterId)
            .forEach(c => {
                const date = new Date(c.when);
                const hour = date.getHours();
                hourBuckets[hour] += Math.abs(c.delta);
            });
        setStats(hourBuckets);
    }, [selectedCounterId, allCounts]);

    if (loading) return <div className="stats-page">Loading...</div>;

    return (
        <div className="stats-page">
            <div className="stats-container">
                {selectedCounterId ? (
                    <>
                        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <select 
                                value={selectedCounterId} 
                                onChange={(e) => setSelectedCounterId(parseInt(e.target.value))}
                                style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: 'bold', 
                                    padding: '5px', 
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    width: 'auto',
                                    margin: '0 auto',
                                    display: 'block',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: 'inherit'
                                }}
                            > 
                                {counters.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'flex-end', 
                            justifyContent: 'center', 
                            gap: '4px', 
                            height: '200px', 
                            paddingBottom: '20px',
                            borderBottom: '2px solid #eee',
                            width: '100%',
                            maxWidth: '600px',
                            margin: '0 auto'
                        }}>
                            {stats.map((value, hour) => (
                                <div key={hour} style={{ 
                                    flex: 1, 
                                    backgroundColor: '#0070f3', 
                                    height: `${(value / (Math.max(...stats) || 1)) * 100}%`, 
                                    minHeight: '2px',
                                    borderRadius: '4px 4px 0 0',
                                    position: 'relative',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.title = `${hour}:00 - ${value} actions`;
                                }}
                                >
                                </div>
                            ))}
                        </div>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            width: '100%', 
                            maxWidth: '600px', 
                            margin: '10px auto 0',
                            fontSize: '0.7rem',
                            color: '#666'
                        }}>
                            <span>0:00</span>
                            <span>12:00</span>
                            <span>23:00</span>
                        </div>
                    </>
                ) : (
                    <h1 style={{ textAlign: 'center' }}>Statistics</h1>
                )}
            </div>
        </div>
    );
};
