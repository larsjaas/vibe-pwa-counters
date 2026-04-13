import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CounterList, Counter } from './CounterList';
import { CounterCreate } from './CounterCreate';
import { CounterDetail } from './CounterDetail';
import { NavBar } from './components/NavBar';


const App: React.FC = () => {
    const [editingCounter, setEditingCounter] = useState<Counter | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleUpdateCounter = async (id: number, name: string, step: number) => {
        try {
            const res = await fetch('/api/counters', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name, step }),
            });
            if (!res.ok) throw new Error('Update failed');
            setEditingCounter(null);
        } catch (e) {
            alert('Failed to update counter');
        }
    };

    const handleDeleteCounter = async (id: number) => {
        try {
            const res = await fetch(`/api/counters/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setEditingCounter(null);
        } catch (e) {
            alert('Failed to delete counter');
        }
    };

    const handleArchiveCounter = async (id: number) => {
        try {
            const res = await fetch('/api/counters', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, archived: true }),
            });
            if (!res.ok) throw new Error('Archive failed');
            setEditingCounter(null);
        } catch (e) {
            alert('Failed to archive counter');
        }
    };

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100%', fontFamily: 'sans-serif', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {/* Main Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '70px' }}>
                <Routes>
                    <Route path="/" element={
                        <CounterList 
                            onEdit={(c) => setEditingCounter(c)} 
                            onCreate={() => setShowCreateModal(true)} 
                        />
                    } />
                    <Route path="/stats" element={
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            textAlign: 'center', 
                            height: '100%', 
                            fontSize: '2em', 
                            padding: '20px' 
                        }}>
                            Statistics are not implemented yet, but they will arrive in a future update.
                        </div>
                    } />
                    <Route path="/profile" element={
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            height: '100%', 
                            fontSize: '1.5em', 
                            padding: '20px' 
                        }}>
                            <div style={{ marginBottom: '20px' }}>Account Information</div>
                            <button 
                                onClick={() => window.location.href = '/api/logout'} 
                                style={{ padding: '8px 16px', cursor: 'pointer' }}
                            >
                                Log Out
                            </button>
                        </div>
                    } />
                </Routes>
            </div>

            <NavBar />

            {/* Modals Overlay */}
            {showCreateModal && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', 
                    alignItems: 'center', zIndex: 1000 
                }} onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
                    <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                        <CounterCreate 
                            onCreated={() => setShowCreateModal(false)} 
                            onCancel={() => setShowCreateModal(false)} 
                        />
                    </div>
                </div>
            )}

            {editingCounter && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', 
                    alignItems: 'center', zIndex: 1000 
                }} onClick={(e) => e.target === e.currentTarget && setEditingCounter(null)}>
                    <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                        <CounterDetail 
                            counter={editingCounter} 
                            onBack={() => setEditingCounter(null)} 
                            onUpdate={handleUpdateCounter}
                            onDelete={handleDeleteCounter}
                            onArchive={handleArchiveCounter}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
