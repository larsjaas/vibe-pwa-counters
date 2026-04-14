import React, { useState, useEffect } from 'react';
import { IconButton } from './components/IconButton';
import { Archive, Trash2 } from 'lucide-react';

interface Counter {
    id: number;
    name: string;
    step: number;
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
        <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0 }}>{isEditing ? 'Edit Counter' : 'Counter Settings'}</h2>
            
            {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
                        <input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Step:</label>
                        <input 
                            type="number"
                            value={step} 
                            onChange={(e) => setStep(parseInt(e.target.value) || 1)} 
                            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setIsEditing(false); setName(counter.name); setStep(counter.step); }}>Cancel</button>
                        <button onClick={handleSave} style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p><strong>Name:</strong> {name}</p>
                    <p><strong>Step:</strong> {step}</p>
                    <button onClick={() => setIsEditing(true)} style={{ width: 'fit-content', padding: '6px 12px', cursor: 'pointer' }}>Edit</button>
                </div>
            )}
            
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <IconButton 
                        icon={Archive} 
                        onClick={() => onArchive(counter.id)} 
                        title="Archive" 
                    />
                    <IconButton 
                        icon={Trash2} 
                        onClick={() => { if(confirm('Delete this counter?')) onDelete(counter.id); }} 
                        title="Delete" 
                        backgroundColor='#ffcccb' 
                    />
                </div>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', fontSize: '1rem' }}>← Back</button>
            </div>
        </div>
    );
};
