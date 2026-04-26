import React, { useState, useEffect } from 'react';
import { IconButton } from './components/IconButton';
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';

interface Counter {
    id: number;
    name: string;
    step: number;
    archivetime: string | null;
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

    const handleSave = () => {
        onUpdate(counter.id, name, step);
        setIsEditing(false);
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
                    <div className="form-actions">
                        <button onClick={() => { setIsEditing(false); setName(counter.name); setStep(counter.step); }} className="btn-secondary">Cancel</button>
                        <button onClick={handleSave} className="btn-primary">Save</button>
                    </div>
                </div>
            ) : (
                <div className="form-group">
                    <p><strong>Name:</strong> {name}</p>
                    <p><strong>Step:</strong> {step}</p>
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
        </div>
    );
};
