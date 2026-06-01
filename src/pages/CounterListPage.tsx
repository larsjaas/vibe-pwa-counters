import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { IconButton } from '../components/IconButton';
import { RecentActivityTable } from '../components/RecentActivityTable';
import { Plus, Edit2, SquareCheckBig, Search, X, UserRoundPlus, ChevronDown, ChevronUp, Trash2, ChevronsUpDown, Eye, EyeOff } from 'lucide-react';
import { TagSharingModal } from '../components/TagSharingModal';
import { Counter, Count, Tag } from '../types';
import { api } from '../services/api';
import { isOverdue, filterAndSortCounters } from '../counters';

interface CounterListProps {
    onEdit: (counter: Counter) => void;
    onCreate: (tags?: string, type?: 'standard' | 'repeating') => void;
    refreshTrigger?: number;
    userEmail?: string | null;
}

export const CounterList: React.FC<CounterListProps> = ({ onEdit, onCreate, refreshTrigger, userEmail }) => {
    const [counters, setCounters] = useState<Counter[]>([]);
    const [updates, setUpdates] = useState<Count[]>([]);
    const [counterTags, setCounterTags] = useState<Record<number, string[]>>({});
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [tagFocusMode, setTagFocusMode] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useLocalStorage('counter-list-show-archived', false);
    const [counterSearchQuery, setCounterSearchQuery] = useLocalStorage('counter-list-search-query-counters', '');
    const [taskSearchQuery, setTaskSearchQuery] = useLocalStorage('counter-list-search-query-tasks', '');
    const [viewMode, setViewMode] = useLocalStorage<'counters' | 'tasks'>('counter-list-view-mode', 'counters');
    const [selectedTagForSharing, setSelectedTagForSharing] = useState<{ id: number; name: string } | null>(null);
    const [expandedCounterId, setExpandedCounterId] = useLocalStorage<number | null>('counter-list-expanded-id', null);
    const [counterNameSort, setCounterNameSort] = useLocalStorage<'asc' | 'desc' | null>('counter-list-name-sort', null);
    const [counterValueSort, setCounterValueSort] = useLocalStorage<'asc' | 'desc' | null>('counter-list-value-sort', null);
    const [taskNameSort, setTaskNameSort] = useLocalStorage<'asc' | 'desc' | null>('task-list-name-sort', null);
    const [taskValueSort, setTaskValueSort] = useLocalStorage<'asc' | 'desc' | null>('task-list-value-sort', null);

    const nameSort = viewMode === 'counters' ? counterNameSort : taskNameSort;
    const valueSort = viewMode === 'counters' ? counterValueSort : taskValueSort;
    const searchQuery = viewMode === 'counters' ? counterSearchQuery : taskSearchQuery;

    const setNameSort = viewMode === 'counters' ? setCounterNameSort : setTaskNameSort;
    const setValueSort = viewMode === 'counters' ? setCounterValueSort : setTaskValueSort;
    const setSearchQuery = viewMode === 'counters' ? setCounterSearchQuery : setTaskSearchQuery;

    const loadCounters = async () => {
        try {
            const [countersData, updatesData, tagsData] = await Promise.all([
                api.getCounters(),
                api.getCounts(),
                api.getTags()
            ]);

            setAllTags(tagsData);
            const updates = updatesData || [];
            setUpdates(updates);

            // Load tag associations and focus_mode settings
            const tagMap: Record<number, string[]> = {};
            const focusModeMap: Record<string, boolean> = {};
            await Promise.all(tagsData.map(async (tag) => {
                const [cids, settings] = await Promise.all([
                    api.getCountersForTag(tag.id),
                    api.getTagSetting(tag.id, 'focus_mode')
                ]);
                cids.forEach(cid => {
                    if (!tagMap[cid]) tagMap[cid] = [];
                    tagMap[cid].push(tag.name);
                });
                focusModeMap[tag.name] = settings.focus_mode === 'true';
            }));
            setCounterTags(tagMap);
            setTagFocusMode(focusModeMap);

            // Calculate current counts
            const countersWithCount = countersData.map(c => {
                const count = updates
                    .filter(u => u.counter === c.id)
                    .reduce((sum, u) => (u.operation === 'reset' ? 0 : sum + u.delta), 0);
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
            await api.addCount(id, delta);
            loadCounters();
        } catch (e) {
            console.error('Error updating counter', e);
            alert('Failed to update counter');
        }
    };

    const handleDeleteUpdate = async (updateId: number) => {
        if (!confirm('Delete this update?')) return;
        try {
            await api.deleteCount(updateId);
            loadCounters();
        } catch (e) {
            console.error('Error deleting update', e);
            alert('Failed to delete update');
        }
    };

    const displayCounters = React.useMemo(() => {
        return filterAndSortCounters(counters, updates, {
            viewMode,
            showArchived,
            searchQuery,
            nameSort,
            valueSort,
            counterTags,
            allTags,
            tagFocusMode
        });
    }, [counters, updates, viewMode, showArchived, searchQuery, counterTags, allTags, nameSort, valueSort, tagFocusMode]);

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
                    {visibleTags.map(tag => {
                        const isSelected = searchQuery.toLowerCase() === tag.name.toLowerCase();
                        const isFocusTag = tagFocusMode[tag.name];
                        return (
                            <span
                                key={tag.id}
                                className="tag-filter-label"
                                onClick={() => setSearchQuery(tag.name)}
                                style={{
                                    fontWeight: tag.user_email === userEmail ? 'bold' : 'normal',
                                    backgroundColor: isSelected ? '#0070f3' : '',
                                    color: isSelected ? 'white' : '',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                {isFocusTag && (isSelected ? <Eye size={14} /> : <EyeOff size={14} />)}
                                {tag.name}
                            </span>
                        );
                    })}
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
                                        color: (c.type === 'repeating' && isOverdue(c)) ? 'darkred' : (c.user_email === userEmail ? 'black' : '#666'),
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
                                                <RecentActivityTable
                                                    counterIds={[c.id]}
                                                    counts={updates}
                                                    currentUserEmail={userEmail}
                                                    onDelete={handleDeleteUpdate}
                                                    limit={3}
                                                    compact={true}
                                                />
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
