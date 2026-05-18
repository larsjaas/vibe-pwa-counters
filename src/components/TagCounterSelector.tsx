import React, { useState, useRef, useEffect } from 'react';
import { Counter, Tag } from '../types';
import { GitBranch, Tag as TagIcon, Search, X } from 'lucide-react';

interface TagCounterSelectorProps {
    counters: Counter[];
    tags: Tag[];
    tagCountersMap: Map<number, number[]>;
    selectedCounterId: number | null;
    setSelectedCounterId: (id: number | null) => void;
    selectedTagId: number | null;
    setSelectedTagId: (id: number | null) => void;
}

export const TagCounterSelector: React.FC<TagCounterSelectorProps> = ({
    counters,
    tags,
    tagCountersMap,
    selectedCounterId,
    setSelectedCounterId,
    selectedTagId,
    setSelectedTagId,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'counters' | 'tags'>('counters');
    const [searchQuery, setSearchQuery] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectCounter = (id: number) => {
        setSelectedCounterId(id);
        setSelectedTagId(null);
        setIsOpen(false);
    };

    const handleSelectTag = (id: number) => {
        setSelectedTagId(id);
        setSelectedCounterId(null);
        setIsOpen(false);
    };

    const filteredCounters = counters.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredTags = tags.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const currentLabel = () => {
        if (selectedCounterId !== null) {
            const c = counters.find(c => c.id === selectedCounterId);
            return c ? `Counter: ${c.name}` : 'Select Counter';
        }
        if (selectedTagId !== null) {
            const t = tags.find(t => t.id === selectedTagId);
            return t ? `Tag: ${t.name}` : 'Select Tag';
        }
        return 'Select Source';
    };

    return (
        <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto' }} ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '6px 12px', 
                    backgroundColor: 'var(--color-white)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    color: 'var(--color-text)'
                }}
            >
                {selectedTagId !== null ? <TagIcon size={16} /> : <GitBranch size={16} />}
                {currentLabel()}
                <span style={{ fontSize: '0.8rem', marginLeft: '4px', opacity: 0.6 }}>▼</span>
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '110%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '300px',
                    backgroundColor: 'var(--color-white)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        display: 'flex', 
                        borderBottom: '1px solid var(--color-border)', 
                        backgroundColor: '#f6f8fa',
                        color: 'var(--color-text)'
                    }}>
                        <button 
                            onClick={() => setActiveTab('counters')}
                            style={{ 
                               flex: 1, 
                               padding: '10px 8px', 
                               border: 'none', 
                               background: activeTab === 'counters' ? 'var(--color-white)' : 'transparent',
                               borderBottom: activeTab === 'counters' ? '2px solid var(--color-primary)' : 'none',
                               cursor: 'pointer',
                               fontSize: '0.9rem',
                               fontWeight: activeTab === 'counters' ? 'bold' : 'normal',
                               color: activeTab === 'counters' ? 'var(--color-primary)' : '#666',
                               transition: 'all 0.2s'
                            }}
                        >
                            Counters
                        </button>
                        <button 
                            onClick={() => setActiveTab('tags')}
                            style={{ 
                               flex: 1, 
                               padding: '10px 8px', 
                               border: 'none', 
                               background: activeTab === 'tags' ? 'var(--color-white)' : 'transparent',
                                borderBottom: activeTab === 'tags' ? '2px solid var(--color-primary)' : 'none',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: activeTab === 'tags' ? 'bold' : 'normal',
                                color: activeTab === 'tags' ? 'var(--color-primary)' : '#666',
                                transition: 'all 0.2s'
                            }}
                        >
                            Tags
                        </button>
                    </div>

                    <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                        <Search size={14} color="#888" />
                        <input 
                            type="text" 
                            placeholder="Filter..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ 
                               border: 'none', 
                                outline: 'none', 
                                fontSize: '0.9rem', 
                                width: '100%', 
                               padding: '4px 0' 
                            }}
                        />
                        {searchQuery && (
                            <button 
                               onClick={() => setSearchQuery('')}
                               style={{
                                   background: 'none',
                                   border: 'none',
                                   cursor: 'pointer',
                                   padding: '0',
                                   display: 'flex',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                                   color: '#888'
                               }}
                            >
                               <X size={14} />
                            </button>
                        )}
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {activeTab === 'counters' ? (
                            filteredCounters.map(c => (
                               <div 
                                   key={c.id}
                                   onClick={() => handleSelectCounter(c.id)}
                                   style={{ 
                                        padding: '8px 12px', 
                                        cursor: 'pointer', 
                                        fontSize: '0.9rem',
                                        backgroundColor: selectedCounterId === c.id ? '#f0f7ff' : 'transparent',
                                        color: selectedCounterId === c.id ? 'var(--color-primary)' : 'var(--color-text)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                   }}
                               >
                                   <GitBranch size={14} />
                                   {c.name}
                               </div>
                            ))
                        ) : (
                            filteredTags.map(t => (
                               <div 
                                   key={t.id}
                                   onClick={() => handleSelectTag(t.id)}
                                   style={{ 
                                        padding: '8px 12px', 
                                        cursor: 'pointer', 
                                        fontSize: '0.9rem',
                                        backgroundColor: selectedTagId === t.id ? '#f0f7ff' : 'transparent',
                                        color: selectedTagId === t.id ? 'var(--color-primary)' : 'var(--color-text)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                   }}
                               >
                                   <TagIcon size={14} />
                                   {t.name}
                               </div>
                            ))
                        )}
                        {(activeTab === 'counters' ? filteredCounters : filteredTags).length === 0 && (
                            <div style={{ padding: '8px 12px', fontSize: '0.9rem', color: '#888', textAlign: 'center' }}>
                                No items found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
