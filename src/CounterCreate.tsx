import React, { useState } from 'react';
import { ConfirmationModal } from './components/ConfirmationModal';
import { parseDurationToSeconds, formatSecondsToDuration } from './utils/duration';
import { api } from './services/api';
import { CreateCounterPayload } from './types';

interface CounterCreateProps {
    onCreated: () => void;
    onCancel: () => void;
    initialTags?: string;
    initialType?: 'standard' | 'repeating';
}

export const CounterCreate: React.FC<CounterCreateProps> = ({ onCreated, onCancel, initialTags, initialType }) => {
    const [name, setName] = useState('');
    const [initial, setInitial] = useState(0);
    const [step, setStep] = useState(1);
    const [type, setType] = useState<'standard' | 'repeating'>(initialType || 'standard');
    const [frequency, setFrequency] = useState('1w');
    const [alertWindow, setAlertWindow] = useState('540');
    const [overdue, setOverdue] = useState('');
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
        const seconds = parseDurationToSeconds(val);
        if (seconds !== null) {
            setAlertWindow(formatSecondsToDuration(Math.round(seconds * 0.15)));
        }
    };

    const finalizeCreate = async () => {
        setLoading(true);
        setError(null);
        try {
            const parsedFrequency = parseDurationToSeconds(frequency);
            if (parsedFrequency === null) {
                throw new Error('Invalid Ideal Frequency duration format');
            }
            const parsedAlertWindow = parseDurationToSeconds(alertWindow);
            if (parsedAlertWindow === null) {
                throw new Error('Invalid Alert Window duration format');
            }
            const parsedOverdue = parseDurationToSeconds(overdue);
            if (overdue && parsedOverdue === null) {
                throw new Error('Invalid Overdue duration format');
            }

            const payload: CreateCounterPayload = {
                name,
                initial,
                step,
                type,
                last_performed_at: 0
            };

            if (type === 'repeating') {
                payload.frequency = parsedFrequency;
                payload.alert_window = parsedAlertWindow;
                payload.overdue = parsedOverdue;
            } else {
                payload.frequency = 0;
                payload.alert_window = 0;
                payload.overdue = null;
            }

            const newCounter = await api.createCounter(payload);

            // If initial value is non-zero, set it by posting a delta
            if (initial !== 0) {
                await api.addCount(newCounter.id, initial);
            }

            // Handle Tags
            const tagNames = tags.split(',').map(t => t.trim()).filter(t => t !== '');
            const allTags = await api.getTags();

            for (const tagName of tagNames) {
                let tagId = allTags.find(t => t.name === tagName)?.id;
                if (!tagId) {
                    const newTag = await api.createTag(tagName);
                    tagId = newTag.id;
                }
                await api.associateTagWithCounter(tagId, newCounter.id);
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
            const allTags = await api.getTags();

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
                            <label className="form-label">Ideal Frequency:</label>
                            <input
                                type="text"
                                value={frequency}
                                onChange={(e) => handleFrequencyChange(e.target.value)}
                                className="form-input"
                                placeholder="e.g. 1w, 1mo, 2h"
                            />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Alert Window:</label>
                            <input
                                type="text"
                                value={alertWindow}
                                onChange={(e) => setAlertWindow(e.target.value)}
                                className="form-input"
                                placeholder="e.g. 1h30m, 90m, 1:30:00"
                            />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Overdue (Optional):</label>
                            <input
                                type="text"
                                value={overdue}
                                onChange={(e) => setOverdue(e.target.value)}
                                className="form-input"
                                placeholder="e.g. 1d, 24h"
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
