import React, { useState, useEffect } from 'react';
import { IconButton } from './components/IconButton';
import { ConfirmationModal } from './components/ConfirmationModal';
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';

interface Counter {
    id: number;
    name: string;
    step: number;
    count: number;
    archivetime: string | null;
    user_email: string;
    type: 'standard' | 'repeating';
    priority_score: number;
    frequency?: number;
    alert_window?: number;
}

interface CounterDetailProps {
    counter: Counter;
    onBack: () => void;
    onUpdate: (id: number, updates: any) => void;
    onDelete: (id: number) => void;
    onArchive: (id: number) => void;
}

export const CounterDetail: React.FC<CounterDetailProps> = ({ counter, onBack, onUpdate, onDelete, onArchive }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(counter.name);
    const [step, setStep] = useState(counter.step);
    const [type, setType] = useState(counter.type);
    const [frequency, setFrequency] = useState(counter.frequency || 3600);
    const [alertWindow, setAlertWindow] = useState(counter.alert_window || 0);
    const [tags, setTags] = useState('');
    const [loadingTags, setLoadingTags] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [tagsToCreate, setTagsToCreate] = useState<string[]>([]);

    const FREQUENCY_MAP: Record<string, number> = {
        hourly: 3600,
        daily: 86400,
        'every other day': 172800,
        weekly: 604800,
        biweekly: 1209600,
        monthly: 2592000,
        yearly: 31536000,
    };

    const getFrequencyLabel = (val: number) => {
        return Object.entries(FREQUENCY_MAP).find(([_, v]) => v === val)?.[0] || 'custom';
    };

    const handleFrequencyChange = (val: string) => {
        const period = FREQUENCY_MAP[val] || 3600;
        setFrequency(period);
        setAlertWindow(Math.round(period * 0.15));
    };

    useEffect(() => {
        const loadTags = async () => {
            try {
                const res = await fetch('/api/tags');
                if (!res.ok) throw new Error('Failed to fetch tags');
                const allTags: any[] = await res.json();
                
                const counterTags: string[] = [];
                for (const tag of allTags) {
                    const associationRes = await fetch(`/api/tags/${tag.id}/counters`);
                    if (associationRes.ok) {
                        const cids: number[] = await associationRes.json();
                        if (cids.includes(counter.id)) {
                            counterTags.push(tag.name);
                        }
                    }
                }
                setTags(counterTags.join(', '));
            } catch (e) {
                console.error('Error loading tags', e);
            } finally {
                setLoadingTags(false);
            }
        };

        loadTags();
    }, [counter.id]);

    const executeSaveTags = async (currentTags: string) => {
        try {
            const tagNames = currentTags.split(',').map(t => t.trim()).filter(t => t !== '');
            
            const res = await fetch('/api/tags');
            if (!res.ok) throw new Error('Failed to fetch tags');
            const allTags: any[] = await res.json();
            
            const associatedTags: any[] = [];
            for (const tag of allTags) {
                const associationRes = await fetch(`/api/tags/${tag.id}/counters`);
                if (associationRes.ok) {
                    const cids: number[] = await associationRes.json();
                    if (cids.includes(counter.id)) {
                        associatedTags.push(tag);
                    }
                }
            }

            const associatedNames = associatedTags.map(t => t.name);

            for (const tag of associatedTags) {
                if (!tagNames.includes(tag.name)) {
                    await fetch(`/api/tags/${tag.id}/counters/${counter.id}`, { method: 'DELETE' });
                }
            }

            for (const name of tagNames) {
                if (!associatedNames.includes(name)) {
                    let tagId = allTags.find(t => t.name === name)?.id;
                    if (!tagId) {
                        const createRes = await fetch('/api/tags', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name }),
                        });
                        if (!createRes.ok) throw new Error(`Failed to create tag ${name}`);
                        const newTag = await createRes.json();
                        tagId = newTag.id;
                    }
                    await fetch(`/api/tags/${tagId}/counters/${counter.id}`, { method: 'POST' });
                }
            }
        } catch (e) {
            alert('Failed to update tags: ' + (e instanceof Error ? e.message : e));
            throw e;
        }
    };

    const handleSave = async () => {
        try {
            const tagNames = tags.split(',').map(t => t.trim()).filter(t => t !== '');
            const res = await fetch('/api/tags');
            if (!res.ok) throw new Error('Failed to fetch tags');
            const allTags: any[] = await res.json();
            
            const newTags = tagNames.filter(name => !allTags.find(t => t.name === name));
            
            if (newTags.length > 0) {
                setTagsToCreate(newTags);
                setShowConfirmModal(true);
            } else {
                await executeSaveTags(tags);
                onUpdate(counter.id, { 
                    name, 
                    step, 
                    type, 
                    frequency: type === 'repeating' ? frequency : 0, 
                    alert_window: type === 'repeating' ? alertWindow : 0 
                });
                setIsEditing(false);
            }
        } catch (e) {
            alert('Error: ' + (e instanceof Error ? e.message : e));
        }
    };

    const confirmCreateTags = async () => {
        try {
            await executeSaveTags(tags);
            onUpdate(counter.id, { 
                name, 
                step, 
                type, 
                frequency: type === 'repeating' ? frequency : 0, 
                alert_window: type === 'repeating' ? alertWindow : 0 
            });
            setIsEditing(false);
            setShowConfirmModal(false);
        } catch (e) {
            alert('Error: ' + (e instanceof Error ? e.message : e));
            setShowConfirmModal(false);
        }
    };

    return (
        <div className="form-container">
            <h2 className="form-title">{isEditing ? 'Edit Counter' : 'Counter Settings'}</h2>
            
            {isEditing ? (
                <div className="form-group">
                    <div className="form-field">
                        <label className="form-label">Name:</label>
                        <input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            className="form-input"
                        />
                    </div>
                    <div className="form-field">
                        <label className="form-label">Type:</label>
                        <select 
                            value={type} 
                            onChange={(e) => setType(e.target.value as 'standard' | 'repeating')} 
                            className="form-input"
                        >
                            <option value="standard">Standard</option>
                            <option value="repeating">Repeating</option>
                        </select>
                    </div>
                    {type === 'repeating' && (
                        <>
                            <div className="form-field">
                                <label className="form-label">Target Frequency:</label>
                                <select 
                                    value={getFrequencyLabel(frequency)} 
                                    onChange={(e) => handleFrequencyChange(e.target.value)} 
                                    className="form-input"
                                >
                                    {Object.entries(FREQUENCY_MAP).map(([label, value]) => (
                                        <option key={label} value={label}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-field">
                                <label className="form-label">Alert Window (seconds):</label>
                                <input 
                                    type="number"
                                    value={alertWindow} 
                                    onChange={(e) => setAlertWindow(parseInt(e.target.value) || 0)} 
                                    className="form-input"
                                />
                            </div>
                        </>
                    )}
                    <div className="form-field">
                        <label className="form-label">Step:</label>
                        <input 
                            type="number"
                            value={step} 
                            onChange={(e) => setStep(parseInt(e.target.value) || 1)} 
                            className="form-input"
                        />
                    </div>
                    <div className="form-field">
                        <label className="form-label">Tags:</label>
                        <input 
                            type="text"
                            value={tags} 
                            onChange={(e) => setTags(e.target.value)} 
                            className="form-input"
                            placeholder="comma separated tags"
                        />
                    </div>
                    <div className="form-actions">
                        <button onClick={() => { setIsEditing(false); setName(counter.name); setStep(counter.step); }} className="btn-secondary">Cancel</button>
                        <button onClick={handleSave} className="btn-primary">Save</button>
                    </div>
                </div>
            ) : (
                <div className="form-group">
                    <p><strong>Name:</strong> {name}</p>
                    <p><strong>Type:</strong> {type === 'standard' ? 'Standard' : 'Repeating'}</p>
                    {type === 'repeating' && (
                        <>
                            <p><strong>Frequency:</strong> {getFrequencyLabel(frequency)}</p>
                            <p><strong>Alert Window:</strong> {alertWindow} seconds</p>
                        </>
                    )}
                    <p><strong>Step:</strong> {step}</p>
                    <p><strong>Tags:</strong> {loadingTags ? 'Loading...' : (tags || 'None')}</p>
                    <button onClick={() => setIsEditing(true)} className="btn-secondary" style={{ width: 'fit-content' }}>Edit</button>
                </div>
            )}
            
            <div className="form-actions" style={{ justifyContent: 'space-between', marginTop: '30px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <IconButton 
                        icon={counter.archivetime ? ArchiveRestore : Archive} 
                        onClick={() => onArchive(counter.id)} 
                        title={counter.archivetime ? "Unarchive" : "Archive"} 
                    />
                    <IconButton 
                        icon={Trash2} 
                        onClick={() => { if(confirm('Delete this counter?')) onDelete(counter.id); }} 
                        title="Delete" 
                        backgroundColor='#ffcccb' 
                    />
                </div>
                <button onClick={onBack} className="btn-secondary">← Back</button>
            </div>

            {showConfirmModal && (
                <ConfirmationModal 
                    message={`The following new tags will be created: ${tagsToCreate.join(', ')}. Do you want to proceed?`}
                    confirmText="Create"
                    cancelText="Cancel"
                    onConfirm={confirmCreateTags}
                    onCancel={() => setShowConfirmModal(false)}
                />
            )}
        </div>
    );
};
