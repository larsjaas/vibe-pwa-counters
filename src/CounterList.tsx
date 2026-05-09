import React, { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { IconButton } from './components/IconButton';
import { Plus, Edit2, SquareCheckBig, Search, X, UserRoundPlus, ChevronDown, ChevronUp, Trash2, ChevronsUpDown } from 'lucide-react';
import { TagSharingModal } from './components/TagSharingModal';

export interface Counter {
    id: number;
    name: string;
    step: number;
    count: number;
    createtime: string;
    archivetime: string | null;
    user_email: string;
    type: 'standard' | 'repeating';
    priority_score: number;
    repeat_status: string;
    frequency: number | null;
    alert_window: number | null;
    last_performed_at: string | null;
}

interface CounterListProps {
    onEdit: (counter: Counter) => void;
    onCreate: (tags?: string, type?: 'standard' | 'repeating') => void;
    refreshTrigger?: number;
    userEmail?: string | null;
}

export const CounterList: React.FC<CounterListProps> = ({ onEdit, onCreate, refreshTrigger, userEmail }) => {
    const [counters, setCounters] = useState<Counter[]>([]);
    const [updates, setUpdates] = useState<Array<{ id: number; counter: number; delta: number; user_email?: string; when?: string }>>([]);
    const [counterTags, setCounterTags] = useState<Record<number, string[]>>({});
    const [allTags, setAllTags] = useState<{ id: number; name: string, user_email: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useLocalStorage('counter-list-show-archived', false);
    const [searchQuery, setSearchQuery] = useLocalStorage('counter-list-search-query', '');
    const [viewMode, setViewMode] = useLocalStorage<'counters' | 'tasks'>('counter-list-view-mode', 'counters');
    const [selectedTagForSharing, setSelectedTagForSharing] = useState<{ id: number; name: string } | null>(null);
    const [expandedCounterId, setExpandedCounterId] = useLocalStorage<number | null>('counter-list-expanded-id', null);
    const [counterNameSort, setCounterNameSort] = useLocalStorage<'asc' | 'desc' | null>('counter-list-name-sort', null);
    const [counterValueSort, setCounterValueSort] = useLocalStorage<'asc' | 'desc' | null>('counter-list-value-sort', null);
    const [taskNameSort, setTaskNameSort] = useLocalStorage<'asc' | 'desc' | null>('task-list-name-sort', null);
    const [taskValueSort, setTaskValueSort] = useLocalStorage<'asc' | 'desc' | null>('task-list-value-sort', null);

    const nameSort = viewMode === 'counters' ? counterNameSort : taskNameSort;
    const valueSort = viewMode === 'counters' ? counterValueSort : taskValueSort;

    const setNameSort = viewMode === 'counters' ? setCounterNameSort : setTaskNameSort;
    const setValueSort = viewMode === 'counters' ? setCounterValueSort : setTaskValueSort;

    const loadCounters = async () => {
        try {
            const [resCounters, resUpdates, resTags] = await Promise.all([
                fetch('/api/counters'),
                fetch('/api/counts'),
                fetch('/api/tags')
            ]);

            if (!resCounters.ok || !resUpdates.ok || !resTags.ok) throw new Error('Failed to fetch data');

            const countersData: Array<{ id: number; name: string; step: number; archivetime: string | null; user_email: string; type: 'standard' | 'repeating'; priority_score: number; repeat_status: string; frequency: number | null; alert_window: number | null; last_performed_at: string | null }> = await resCounters.json();
            const updatesData = await resUpdates.json();
            const tagsData: Array<{ id: number; name: string, user_email: string }> = await resTags.json();
            setAllTags(tagsData);
            const updates: Array<{ id: number; counter: number; delta: number; user_email?: string; when?: string }> = updatesData || [];
            setUpdates(updates);

            // Load tag associations
            const tagMap: Record<number, string[]> = {};
            await Promise.all(tagsData.map(async (tag) => {
                const res = await fetch(`/api/tags/${tag.id}/counters`);
                if (res.ok) {
                    const cids: number[] = await res.json();
                    cids.forEach(cid => {
                        if (!tagMap[cid]) tagMap[cid] = [];
                        tagMap[cid].push(tag.name);
                    });
                }
            }));
            setCounterTags(tagMap);

            // Calculate current counts
            const countersWithCount = countersData.map(c => {
                const count = updates
                    .filter(u => u.counter === c.id)
                    .reduce((sum, u) => (u.delta === 0 ? 0 : sum + u.delta), 0);
                return { ...c, count };
            });

            setCounters(countersWithCount);
        } catch (e) {
            console.error('Error loading counters', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCounters();
    }, [refreshTrigger]);

    const handleDeltaUpdate = async (id: number, delta: number) => {
        try {
            const res = await fetch('/api/counts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ counter: id, delta }),
            });
            if (!res.ok) throw new Error('Update failed');
            loadCounters();
        } catch (e) {
            console.error('Error updating counter', e);
            alert('Failed to update counter');
        }
    };

    const handleDeleteUpdate = async (updateId: number) => {
        if (!confirm('Delete this update?')) return;
        try {
            const res = await fetch(`/api/counts/${updateId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Delete failed');
            loadCounters();
        } catch (e) {
            console.error('Error deleting update', e);
            alert('Failed to delete update');
        }
    };

    const displayCounters = React.useMemo(() => {
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

        // Apply search filter
        const query = searchQuery.toLowerCase();
        if (!query) return result;

        return result.filter(c => {
            const tags = counterTags[c.id] || [];
            const isGlobalExactTagMatch = allTags.some(tag => tag.name.toLowerCase() === query);
            if (isGlobalExactTagMatch) {
                return tags.some(tag => tag.toLowerCase() === query);
            }
            const nameMatch = c.name.toLowerCase().includes(query);
            const tagMatch = tags.some(tag => tag.toLowerCase().includes(query));
            return nameMatch || tagMatch;
        });
    }, [counters, updates, viewMode, showArchived, searchQuery, counterTags, allTags, nameSort, valueSort]);

    const visibleTags = React.useMemo(() => {
        const activeCounters = counters.filter(c => 
            viewMode === 'counters' ? c.type === 'standard' : c.type === 'repeating'
        );
        const usedTags = new Set<string>();
        activeCounters.forEach(c => {
            (counterTags[c.id] || []).forEach(tag => usedTags.add(tag));
        });
        return allTags.filter(tag => usedTags.has(tag.name));
    }, [allTags, counters, counterTags, viewMode]);

    return (
        <div className="counter-list-container">
            <div className="counter-list-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0 }}>{viewMode === 'counters' ? 'Counters' : 'Tasks'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '2px', background: '#eee', padding: '2px', borderRadius: '6px' }}>
                        <button 
                            onClick={() => setViewMode('counters')}
                            style={{ 
                                padding: '4px 10px', 
                                borderRadius: '4px', 
                                border: 'none', 
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                backgroundColor: viewMode === 'counters' ? '#fff' : 'transparent',
                                boxShadow: viewMode === 'counters' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                fontWeight: viewMode === 'counters' ? 'bold' : 'normal',
                                color: viewMode === 'counters' ? '#000' : '#666',
                                transition: 'all 0.2s'
                            }}
                        >
                            Counters
                        </button>
                        <button 
                            onClick={() => setViewMode('tasks')}
                            style={{ 
                                padding: '4px 10px', 
                                borderRadius: '4px', 
                                border: 'none', 
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                backgroundColor: viewMode === 'tasks' ? '#fff' : 'transparent',
                                boxShadow: viewMode === 'tasks' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                fontWeight: viewMode === 'tasks' ? 'bold' : 'normal',
                                color: viewMode === 'tasks' ? '#000' : '#666',
                                transition: 'all 0.2s'
                            }}
                        >
                            Tasks
                        </button>
                    </div>
                    <IconButton 
                        icon={Plus} 
                        onClick={() => {
                            const matchedTag = allTags.find(t => t.name.toLowerCase() === searchQuery.toLowerCase());
                            onCreate(matchedTag ? matchedTag.name : undefined, viewMode === 'tasks' ? 'repeating' : 'standard');
                        }} 
                        title="Create New Counter" 
                        backgroundColor="#0070f3" 
                        color="#fff" 
                    />
                </div>
            </div>

            <div className="search-input-container">
                <Search className="search-icon" size={20} />
                <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Filter counters..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="search-actions">
                    {allTags.some(t => t.name.toLowerCase() === searchQuery.toLowerCase() && t.user_email === userEmail) && (
                        <button 
                            className="search-action-btn" 
                            onClick={() => {
                               const tag = allTags.find(t => t.name.toLowerCase() === searchQuery.toLowerCase());
                               if (tag) setSelectedTagForSharing(tag);
                            }}
                            title="Manage Tag Sharing"
                        >
                            <UserRoundPlus size={18} />
                        </button>
                    )}
                    {searchQuery && (
                        <button 
                            className="search-action-btn" 
                            onClick={() => setSearchQuery('')}
                            title="Clear search"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {visibleTags.length > 0 && (
                <div className="tags-filter-container">
                    {visibleTags
                        .filter(tag => !searchQuery.toLowerCase().includes(tag.name.toLowerCase()))
                        .map(tag => (
                            <span 
                                key={tag.id} 
                                className="tag-filter-label" 
                                onClick={() => setSearchQuery(tag.name)}
                                style={{ fontWeight: tag.user_email === userEmail ? 'bold' : 'normal' }}
                            >
                                {tag.name}
                            </span>
                        ))
                    }
                </div>
            )}

            <table className="counter-table">
                <thead>
                    <tr className="table-header-row">
                        <th className="table-cell" style={{ cursor: 'pointer' }}
                            onClick={() => {
                                setValueSort(null);
                                setNameSort(prev => {
                                    if (prev === null) return 'asc';
                                    if (prev === 'asc') return 'desc';
                                    return null;
                                });
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Name
                                {nameSort === 'asc' && <ChevronUp size={14} />}
                                {nameSort === 'desc' && <ChevronDown size={14} />}
                                {nameSort === null && <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                            </div>
                        </th>
                        <th className="table-cell text-right" style={{ cursor: 'pointer' }}
                            onClick={() => {
                                setNameSort(null);
                                setValueSort(prev => {
                                    if (prev === null) return 'desc';
                                    if (prev === 'desc') return 'asc';
                                    return null;
                                });
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                Count
                                {valueSort === 'asc' && <ChevronUp size={14} />}
                                {valueSort === 'desc' && <ChevronDown size={14} />}
                                {valueSort === null && <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                            </div>
                        </th>
                        <th className="table-cell text-right">Actions</th>
                    </tr>
                </thead>
                <tbody style={{ display: 'table-row-group' }}>
                    {displayCounters.map(c => (
                        <React.Fragment key={c.id}>
                            <tr className="table-row">
                                <td className="table-cell" 
                                    style={{ 
                                        fontWeight: c.user_email === userEmail ? 'bold' : 'normal', 
                                        color: c.user_email === userEmail ? 'black' : '#666',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        textUnderlineOffset: '3px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        textAlign: 'left'
                                    }}
                                    onClick={() => setExpandedCounterId(expandedCounterId === c.id ? null : c.id)}
                                >
                                    {c.name}
                                    {expandedCounterId === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </td>
                                <td className="table-cell text-right font-bold">{c.count}</td>
                                <td className="table-cell action-cell">
                                    <IconButton 
                                        icon={SquareCheckBig} 
                                        onClick={async () => {
                                            await handleDeltaUpdate(c.id, c.step);
                                        }} 
                                        title="Increment" 
                                    />
                                    <IconButton 
                                        icon={Edit2} 
                                        onClick={() => onEdit(c)} 
                                        title="Edit" 
                                    />
                                </td>
                            </tr>
                            {expandedCounterId === c.id && (
                                <tr className="table-row expanded-row">
                                    <td colSpan={3} className="table-cell">
                                        <div className="expansion-container">
                                            <div className="expansion-buttons-row">
                                                <span className="expansion-label">Quick Update:</span>
                                                {c.step !== 1 && (
                                                    <button className="btn-delta" onClick={() => handleDeltaUpdate(c.id, -c.step)}>
                                                        {c.step > 0 ? `-${c.step}` : `+${Math.abs(c.step)}`}
                                                    </button>
                                                )}
                                                <button className="btn-delta" onClick={() => handleDeltaUpdate(c.id, -1)}>-1</button>
                                                <button className="btn-delta" onClick={() => handleDeltaUpdate(c.id, 1)}>+1</button>
                                                {c.step !== 1 && (
                                                    <button className="btn-delta" onClick={() => handleDeltaUpdate(c.id, c.step)}>
                                                        {c.step > 0 ? `+${c.step}` : `-${Math.abs(c.step)}`}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="expansion-history-row">
                                                <span className="expansion-label">Recent activity:</span>
                                                <div className="history-list">
                                                    {(() => {
                                                        const recent = updates
                                                            .filter(u => u.counter === c.id)
                                                            .slice(-3)
                                                            .reverse();
                                                        if (recent.length === 0) return <div className="history-item">No recent updates</div>;
                                                        return recent.map((u, idx) => (
                                                                  <div key={idx} className="history-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                          <span style={{ fontWeight: 'bold' }}>{u.user_email || 'Unknown'}</span>
                                                                          {u.when && ` at ${new Date(u.when).toLocaleString()}`}: 
                                                                          {u.delta === 0 ? 'Reset!' : `Delta ${u.delta > 0 ? `+${u.delta}` : u.delta}`}
                                                                      </div>
                                                                      {(c.user_email === userEmail || u.user_email === userEmail) && (
                                                                          <button 
                                                                              onClick={() => handleDeleteUpdate(u.id)}
                                                                              title="Delete update"
                                                                              style={{ 
                                                                                  background: 'none', 
                                                                                  border: 'none', 
                                                                                  cursor: 'pointer', 
                                                                                  color: '#ff4d4f',
                                                                                  padding: '2px' 
                                                                              }}
                                                                          >
                                                                              <Trash2 size={14} />
                                                                          </button>
                                                                      )}
                                                                  </div>
                                                        ));

                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
            {displayCounters.length === 0 && (
                <p className="empty-text">No counters found. Create one!</p>
            )}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button 
                    onClick={() => setShowArchived(!showArchived)} 
                    className="btn-link"
                    style={{ fontSize: '0.9rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                    {viewMode === 'counters' 
                        ? (showArchived ? 'Hide archived counters' : 'Show archived counters') 
                        : (showArchived ? 'Hide archived and sleeping tasks' : 'Show archived and sleeping tasks')}
                </button>
            </div>

            {selectedTagForSharing && (
                <TagSharingModal 
                    tagId={selectedTagForSharing.id}
                    tagName={selectedTagForSharing.name}
                    onClose={() => setSelectedTagForSharing(null)}
                />
            )}
        </div>
    );
};
