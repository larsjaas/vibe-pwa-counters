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
    const [type, setType] = useState<'standard' | 'repeating'>('standard');
    const [frequency, setFrequency] = useState('hourly');
    const [alertWindow, setAlertWindow] = useState(540);
    const [tags, setTags] = useState(initialTags || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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

    const handleFrequencyChange = (val: string) => {
        setFrequency(val);
        const period = FREQUENCY_MAP[val] || 3600;
        setAlertWindow(Math.round(period * 0.15));
    };

    const finalizeCreate = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload: any = { name, initial, step, type };
            
            if (type === 'repeating') {
                payload.frequency = FREQUENCY_MAP[frequency] || 3600;
                payload.alert_window = alertWindow;
            } else {
                payload.frequency = 0;
                payload.alert_window = 0;
                payload.last_performed_at = 0;
            }

            const res = await fetch('/api/counters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
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
                                value={frequency} 
                                onChange={(e) => handleFrequencyChange(e.target.value)} 
                                className="form-input"
                            >
                                <option value="hourly">Hourly</option>
                                <option value="daily">Daily</option>
                                <option value="every other day">Every other day</option>
                                <option value="weekly">Weekly</option>
                                <option value="biweekly">Biweekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
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
