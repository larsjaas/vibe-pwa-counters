import React, { useEffect, useState } from 'react';
import { Counter } from './CounterList';
import { Activity, Timer, Trash2, Pencil } from 'lucide-react';
import { ConfirmationModal } from './components/ConfirmationModal';

type GraphMode = 'frequency' | 'timeline';

interface StatisticsPageProps {
    refreshTrigger?: number;
}

interface Count {
    id: number;
    counter: number;
    delta: number;
    when: string;
    user_email: string;
}

export const StatisticsPage: React.FC<StatisticsPageProps> = ({ refreshTrigger }) => {
    const [counters, setCounters] = useState<Counter[]>([]);
    const [selectedCounterId, setSelectedCounterId] = useState<number | null>(null);
    const [stats, setStats] = useState<number[]>(new Array(24).fill(0));
    const [loading, setLoading] = useState(true);
    const [allCounts, setAllCounts] = useState<Count[]>([]);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [countToDelete, setCountToDelete] = useState<number | null>(null);
    const [countToEdit, setCountToEdit] = useState<{ id: number; when: string } | null>(null);
    const [editWhen, setEditWhen] = useState('');
    const [graphMode, setGraphMode] = useState<GraphMode>(() => {
        return (localStorage.getItem('statsGraphMode') as GraphMode) || 'frequency';
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resCounters, resCounts, resAccount] = await Promise.all([
                    fetch('/api/counters'),
                    fetch('/api/counts'),
                    fetch('/api/account')
                ]);

                if (!resCounters.ok || !resCounts.ok || !resAccount.ok) throw new Error('Failed to fetch data');

                const countersData: Counter[] = await resCounters.json();
                const countsData: Count[] = await resCounts.json();
                const accountData: { email: string } = await resAccount.json();

                setCurrentUserEmail(accountData.email);

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
    }, [refreshTrigger]);

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

    const handleModeChange = (mode: GraphMode) => {
        setGraphMode(mode);
        localStorage.setItem('statsGraphMode', mode);
    };

    const handleUpdateTimestamp = async () => {
        if (!countToEdit) return;
        try {
            const res = await fetch(`/api/counts/${countToEdit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ when: new Date(editWhen).toISOString() }),
            });
            if (!res.ok) throw new Error('Failed to update timestamp');
            
            // Refresh data
            const [resCounters, resCounts] = await Promise.all([
                fetch('/api/counters'),
                fetch('/api/counts')
            ]);
            const countersData = await resCounters.json();
            const countsData = await resCounts.json();
            setCounters(countersData);
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
                {selectedCounterId ? (
                    <>
                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <h1 style={{ textAlign: 'center', margin: 0, fontSize: '1.5rem' }}>Statistics</h1>
                            <div style={{ position: 'absolute', top: '50%', right: '16px', transform: 'translateY(-50%)', display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => handleModeChange('frequency')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '6px',
                                        backgroundColor: graphMode === 'frequency' ? '#0070f3' : 'transparent',
                                        color: graphMode === 'frequency' ? '#fff' : 'inherit',
                                        border: '1px solid #0070f3',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                    title="Frequency"
                                >
                                    <Activity size={20} />
                                </button>
                                <button
                                    onClick={() => handleModeChange('timeline')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '6px',
                                        backgroundColor: graphMode === 'timeline' ? '#0070f3' : 'transparent',
                                        color: graphMode === 'timeline' ? '#fff' : 'inherit',
                                        border: '1px solid #0070f3',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                    title="Timeline"
                                >
                                    <Timer size={20} />
                                </button>
                            </div>
                        </div>
                        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <select 
                                value={selectedCounterId} 
                                onChange={(e) => setSelectedCounterId(parseInt(e.target.value))}
                                style={{ 
                                    fontSize: '1.2rem', 
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
                            width: '100%', 
                            maxWidth: '650px', 
                            margin: '0 auto',
                            paddingBottom: '20px',
                            borderBottom: '2px solid #eee'
                        }}>
                            <div style={{ 
                                position: 'relative', 
                                height: '180px', 
                                width: '40px', 
                                marginBottom: '0px',
                                display: 'flex',
                                justifyContent: 'flex-end'
                            }}>
                                <div style={{ 
                                    position: 'absolute', 
                                    right: 0, 
                                    top: 0, 
                                    bottom: 0, 
                                    width: '1px', 
                                    backgroundColor: '#ccc' 
                                }} />
                                {(() => {
                                    const maxStats = Math.max(...stats);
                                    const getLabels = (max: number) => {
                                        if (max === 0) return [0];
                                        if (max === 1) return [0, 1];
                                        let step: number;
                                        if (max <= 4) step = 1;
                                        else if (max <= 9) step = 2;
                                        else if (max <= 19) step = 5;
                                        else if (max <= 49) step = 10;
                                        else if (max <= 124) step = 25;
                                        else if (max <= 249) step = 50;
                                        else if (max <= 499) step = 100;
                                        else if (max <= 999) step = 250;
                                        else step = 500;
                                        const labels = [];
                                        for (let v = 0; v < max; v += step) labels.push(v);
                                        labels.push(max);
                                        return labels;
                                    };
                                    const labels = getLabels(maxStats);
                                    return labels.map(l => {
                                        const pos = maxStats === 0 ? 0 : (l / maxStats) * 100;
                                        return (
                                            <div key={l} style={{ 
                                                position: 'absolute', 
                                                bottom: `${pos}%`, 
                                                right: 0, 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'flex-end',
                                                width: '40px',
                                                fontSize: '0.7rem', 
                                                color: '#666',
                                                pointerEvents: 'none',
                                                transform: 'translateY(50%)'
                                            }}>
                                                <span style={{ marginRight: '4px' }}>{l}</span>
                                                <div style={{ 
                                                    width: '4px', 
                                                    height: '1px', 
                                                    backgroundColor: '#ccc' 
                                                }} />
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'flex-end', 
                                justifyContent: 'center', 
                                gap: '4px', 
                                height: '180px', 
                                width: '100%',
                                maxWidth: '600px',
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
                        {countToDelete !== null && (
                            <ConfirmationModal 
                                message="Do you want to delete the selected count?" 
                                onConfirm={async () => {
                                    try {
                                        await fetch(`/api/counts/${countToDelete}`, { method: 'DELETE' });
                                        // Refresh data
                                        const [resCounters, resCounts] = await Promise.all([
                                            fetch('/api/counters'),
                                            fetch('/api/counts')
                                        ]);
                                        const countersData = await resCounters.json();
                                        const countsData = await resCounts.json();
                                        setCounters(countersData);
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
                            <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: '#444' }}>Recent Activity</h3>
                            <table style={{ 
                                width: '100%', 
                                borderCollapse: 'collapse', 
                                textAlign: 'left',
                                fontSize: '0.85rem'
                            }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #eee', color: '#888' }}>
                                        <th style={{ padding: '8px 0' }}>Time</th>
                                   <th style={{ padding: '8px 0' }}>Who</th>
                                   <th style={{ padding: '8px 0', textAlign: 'right' }}>Delta</th>
                                        <th style={{ padding: '8px 0', textAlign: 'right' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allCounts
                                        .filter(c => c.counter === selectedCounterId)
                                        .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
                                        .slice(0, 5)
                                        .map((entry, idx) => (
                                            <tr key={entry.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                                <td style={{ padding: '8px 0', color: '#666' }}>
                                   {new Date(entry.when).toLocaleString()}
                               </td>
                               <td style={{ padding: '8px 0', color: '#666' }}>
                                   {entry.user_email}
                               </td>
                                                <td style={{ 
                                                    padding: '8px 0', 
                                                    textAlign: 'right', 
                                                    fontWeight: 'bold',
                                                    color: entry.delta >= 0 ? '#2ecc71' : '#e74c3c'
                                                }}>
                                                    {entry.delta === 0 ? 'reset' : (entry.delta > 0 ? `+${entry.delta}` : entry.delta)}
                                                </td>
                                                <td style={{ padding: '8px 0', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                            {entry.user_email === currentUserEmail && (
                                <Pencil 
                                    size={16} 
                                    color="#666" 
                                    style={{ cursor: 'pointer' }} 
                                    onClick={() => {
                                        setCountToEdit({ id: entry.id, when: entry.when });
                                        setEditWhen(formatForInput(entry.when));
                                    }}
                                />
                            )}
                            <Trash2 
                                size={16} 
                                color="#d32f2f" 
                                style={{ cursor: 'pointer' }} 
                                onClick={() => setCountToDelete(entry.id)}
                            />
                        </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                            {allCounts.filter(c => c.counter === selectedCounterId).length === 0 && (
                                <div style={{ textAlign: 'center', color: '#999', padding: '1rem 0' }}>
                                    No activity recorded for this counter.
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <h1 style={{ textAlign: 'center' }}>Statistics</h1>
                )}
            </div>
        </div>
    );
};
