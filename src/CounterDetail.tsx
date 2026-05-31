import React, { useState, useEffect } from 'react';
import { IconButton } from './components/IconButton';
import { ConfirmationModal } from './components/ConfirmationModal';
import { Archive, ArchiveRestore, Trash2, RotateCcw, RedoDot } from 'lucide-react';
import { parseDurationToSeconds, formatSecondsToDuration } from './utils/duration';
import { Counter, Tag } from './types';
import { api } from './services/api';

interface CounterDetailProps {
    counter: Counter;
    onBack: () => void;
    onUpdate: (id: number, updates: any) => void;
    onDelete: (id: number) => void;
    onArchive: (id: number) => void;
    onReset: (id: number, initialValue: number) => void;
    onPunt?: (id: number) => void;
}

export const CounterDetail: React.FC<CounterDetailProps> = ({ counter, onBack, onUpdate, onDelete, onArchive, onReset, onPunt }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(counter.name);
    const [step, setStep] = useState(counter.step);
    const [type, setType] = useState(counter.type);
    const [frequency, setFrequency] = useState(formatSecondsToDuration(counter.frequency || 3600));
    const [alertWindow, setAlertWindow] = useState(formatSecondsToDuration(counter.alert_window || 0));
    const [overdue, setOverdue] = useState(formatSecondsToDuration(counter.overdue || 0).replace('0s', ''));
    const [initialValue, setInitialValue] = useState<number>(counter.initial_value || 0);
    const [tags, setTags] = useState('');
    const [loadingTags, setLoadingTags] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [tagsToCreate, setTagsToCreate] = useState<string[]>([]);
    const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

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
        setFrequency(val);
        const seconds = parseDurationToSeconds(val);
        if (seconds !== null) {
            setAlertWindow(formatSecondsToDuration(Math.round(seconds * 0.15)));
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const allTags = await api.getTags();

                const counterTags: string[] = [];
                for (const tag of allTags) {
                    const cids = await api.getCountersForTag(tag.id);
                    if (cids.includes(counter.id)) {
                        counterTags.push(tag.name);
                    }
                }
                setTags(counterTags.join(', '));
            } catch (e) {
                console.error('Error loading data', e);
            } finally {
                setLoadingTags(false);
            }
        };

        loadData();
    }, [counter.id]);

    // Sync local state when the counter prop changes (e.g. after save)
    useEffect(() => {
        setInitialValue(counter.initial_value || 0);
    }, [counter.initial_value]);

    const executeSaveTags = async (currentTags: string) => {
        try {
            const tagNames = currentTags.split(',').map(t => t.trim()).filter(t => t !== '');

            const allTags = await api.getTags();

            const associatedTags: Tag[] = [];
            for (const tag of allTags) {
                const cids = await api.getCountersForTag(tag.id);
                if (cids.includes(counter.id)) {
                    associatedTags.push(tag);
                }
            }

            const associatedNames = associatedTags.map(t => t.name);

            for (const tag of associatedTags) {
                if (!tagNames.includes(tag.name)) {
                    await api.dissociateTagFromCounter(tag.id, counter.id);
                }
            }

            for (const name of tagNames) {
                if (!associatedNames.includes(name)) {
                    let tagId = allTags.find(t => t.name === name)?.id;
                    if (!tagId) {
                        const newTag = await api.createTag(name);
                        tagId = newTag.id;
                    }
                    await api.associateTagWithCounter(tagId, counter.id);
                }
            }
        } catch (e) {
            alert('Failed to update tags: ' + (e instanceof Error ? e.message : e));
            throw e;
        }
    };

    const handleSave = async () => {
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

            const tagNames = tags.split(',').map(t => t.trim()).filter(t => t !== '');
            const allTags = await api.getTags();

            const newTags = tagNames.filter(name => !allTags.find(t => t.name === name));

            if (newTags.length > 0) {
                setTagsToCreate(newTags);
                setShowConfirmModal(true);
            } else {
                await executeSaveTags(tags);
                onUpdate(counter.id, {
                    name,
                    step,
                    initial_value: initialValue,
                    type,
                    frequency: type === 'repeating' ? parsedFrequency : 0,
                    alert_window: type === 'repeating' ? parsedAlertWindow : 0,
                    overdue: type === 'repeating' ? parsedOverdue : null
                });
                setIsEditing(false);
            }
        } catch (e) {
            alert('Error: ' + (e instanceof Error ? e.message : e));
        }
    };

    const confirmCreateTags = async () => {
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

            await executeSaveTags(tags);
            onUpdate(counter.id, {
                name,
                step,
                initial_value: initialValue,
                type,
                frequency: type === 'repeating' ? parsedFrequency : 0,
                alert_window: type === 'repeating' ? parsedAlertWindow : 0,
                overdue: type === 'repeating' ? parsedOverdue : null
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
                        <label className="form-label">Step:</label>
                        <input
                            type="number"
                            value={step}
                            onChange={(e) => setStep(parseInt(e.target.value) || 1)}
                            className="form-input"
                        />
                    </div>
                    <div className="form-field">
                        <label className="form-label">Initial Value:</label>
                        <input
                            type="number"
                            value={initialValue}
                            onChange={(e) => setInitialValue(parseInt(e.target.value) || 0)}
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
                        <button onClick={() => { setIsEditing(false); setName(counter.name); setStep(counter.step); setInitialValue(counter.initial_value || 0); }} className="btn-secondary">Cancel</button>
                        <button onClick={handleSave} className="btn-primary">Save</button>
                    </div>
                </div>
            ) : (
                <div className="form-group">
                    <p><strong>Name:</strong> {name}</p>
                    <p><strong>Type:</strong> {type === 'standard' ? 'Standard' : 'Repeating'}</p>
                    {type === 'repeating' && (
                        <>
                            <p><strong>Frequency:</strong> {formatSecondsToDuration(counter.frequency || 0)}</p>
                            <p><strong>Alert Window:</strong> {formatSecondsToDuration(counter.alert_window || 0)}</p>
                            <p><strong>Overdue:</strong> {counter.overdue ? formatSecondsToDuration(counter.overdue) : 'None'}</p>
                        </>
                    )}
                    <p><strong>Initial Value:</strong> {initialValue}</p>
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
                        icon={RotateCcw}
                        onClick={() => setShowResetConfirmModal(true)}
                        title="Reset"
                    />
                    {counter.type === 'repeating' && onPunt && (
                        <IconButton
                            icon={RedoDot}
                            onClick={() => {
                                if (confirm(`Punt "${counter.name}"? This will defer the task until the next cycle.`)) {
                                    onPunt(counter.id);
                                }
                            }}
                            title="Punt"
                        />
                    )}
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

            {showResetConfirmModal && (
                <ConfirmationModal
                    message={`Are you sure you want to reset the count for "${counter.name}"? This will set the count to 0, then to the initial value (${initialValue}).`}
                    confirmText="Reset"
                    cancelText="Cancel"
                    onConfirm={() => {
                        onReset(counter.id, initialValue);
                        setShowResetConfirmModal(false);
                    }}
                    onCancel={() => setShowResetConfirmModal(false)}
                />
            )}
        </div>
    );
};
