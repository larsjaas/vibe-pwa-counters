import React, { useState, useEffect } from 'react';
import { IconButton } from './components/IconButton';
import { ConfirmationModal } from './components/ConfirmationModal';
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';

interface Counter {
    id: number;
    name: string;
    step: number;
    archivetime: string | null;
    user_email: string;
}

interface CounterDetailProps {
    counter: Counter;
    onBack: () => void;
    onUpdate: (id: number, name: string, step: number) => void;
    onDelete: (id: number) => void;
    onArchive: (id: number) => void;
}

export const CounterDetail: React.FC<CounterDetailProps> = ({ counter, onBack, onUpdate, onDelete, onArchive }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(counter.name);
    const [step, setStep] = useState(counter.step);
    const [tags, setTags] = useState('');
    const [loadingTags, setLoadingTags] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [tagsToCreate, setTagsToCreate] = useState<string[]>([]);

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
                onUpdate(counter.id, name, step);
                setIsEditing(false);
            }
        } catch (e) {
            alert('Error: ' + (e instanceof Error ? e.message : e));
        }
    };

    const confirmCreateTags = async () => {
        try {
            await executeSaveTags(tags);
            onUpdate(counter.id, name, step);
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
