import React, { useEffect, useState } from 'react';
import { Counter } from './CounterList';

export const StatisticsPage: React.FC = () => {
    const [mruCounter, setMruCounter] = useState<{ name: string, id: number } | null>(null);
    const [stats, setStats] = useState<number[]>(new Array(24).fill(0));
    const [loading, setLoading] = useState(true);

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

                // Find MRU counter (non-archived)
                let mruId: number | null = null;
                let mruName: string | null = null;
                for (let i = countsData.length - 1; i >= 0; i--) {
                    const count = countsData[i];
                    const counter = countersData.find(c => c.id === count.counter);
                    if (counter && counter.archivetime === null) {
                        mruId = counter.id;
                        mruName = counter.name;
                        break;
                    }
                }

                if (mruId === null) {
                    setMruCounter(null);
                    setLoading(false);
                    return;
                }

                // Calculate stats for the MRU counter: activity per hour of day
                const hourBuckets = new Array(24).fill(0);
                countsData
                    .filter(c => c.counter === mruId)
                    .forEach(c => {
                        const date = new Date(c.when);
                        const hour = date.getHours();
                        hourBuckets[hour] += Math.abs(c.delta);
                    });

                setMruCounter({ name: mruName!, id: mruId });
                setStats(hourBuckets);
            } catch (e) {
                console.error('Error loading stats', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className="stats-page">Loading...</div>;

    return (
        <div className="stats-page">
            <div className="stats-container">
                {mruCounter ? (
                    <>
                        <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>{mruCounter.name}</h1>
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
