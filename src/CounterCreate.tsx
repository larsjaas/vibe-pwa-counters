import React, { useState } from 'react';
import { ConfirmationModal } from './components/ConfirmationModal';

interface CounterCreateProps {
    onCreated: () => void;
    onCancel: () => void;
    initialTags?: string;
}

export const CounterCreate: React.FC<CounterCreateProps> = ({ onCreated, onCancel, initialTags }) => {
    const [name, setName] = useState('');
    const [initial, setInitial] = useState(0);
    const [step, setStep] = useState(1);
    const [tags, setTags] = useState(initialTags || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [tagsToCreate, setTagsToCreate] = useState<string[]>([]);

    const finalizeCreate = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/counters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, initial, step }),
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            
            const newCounter = await res.json();

            // If initial value is non-zero, set it by posting a delta
            if (initial !== 0) {
                await fetch('/api/counts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ counter: newCounter.id, delta: initial }),
                });
            }

            // Handle Tags
            const tagNames = tags.split(',').map(t => t.trim()).filter(t => t !== '');
            const tagsRes = await fetch('/api/tags');
            if (!tagsRes.ok) throw new Error('Failed to fetch tags');
            const allTags: any[] = await tagsRes.json();

            for (const tagName of tagNames) {
                let tagId = allTags.find(t => t.name === tagName)?.id;
                if (!tagId) {
                    const createRes = await fetch('/api/tags', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: tagName }),
                    });
                    if (!createRes.ok) throw new Error(`Failed to create tag ${tagName}`);
                    const newTag = await createRes.json();
                    tagId = newTag.id;
                }
                await fetch(`/api/tags/${tagId}/counters/${newCounter.id}`, { method: 'POST' });
            }

            onCreated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create counter');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const tagNames = tags.split(',').map(t => t.trim()).filter(t => t !== '');
            const res = await fetch('/api/tags');
            if (!res.ok) throw new Error('Failed to fetch tags');
            const allTags: any[] = await res.json();
            
            const newTags = tagNames.filter(name => !allTags.find(t => t.name === name));

            if (newTags.length > 0) {
                setTagsToCreate(newTags);
                setShowConfirmModal(true);
                setLoading(false);
            } else {
                await finalizeCreate();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to verify tags');
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <h2 className="form-title">Create Counter</h2>
            <form onSubmit={handleSubmit} className="form-group">
                <div className="form-field">
                    <label className="form-label">Name:</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required 
                        className="form-input"
                    />
                </div>
                <div className="form-field">
                    <label className="form-label">Initial Value:</label>
                    <input 
                        type="number" 
                        value={initial} 
                        onChange={(e) => setInitial(parseInt(e.target.value) || 0)} 
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

                {error && <div className="form-error">{error}</div>}

                <div className="form-actions">
                    <button type="button" onClick={onCancel} disabled={loading}>Cancel</button>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="btn-primary"
                    >
                        {loading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </form>

            {showConfirmModal && (
                <ConfirmationModal 
                    message={`The following new tags will be created: ${tagsToCreate.join(', ')}. Do you want to proceed?`}
                    confirmText="Create"
                    cancelText="Cancel"
                    onConfirm={() => {
                        setShowConfirmModal(false);
                        finalizeCreate();
                    }}
                    onCancel={() => setShowConfirmModal(false)}
                />
            )}
        </div>
    );
};
