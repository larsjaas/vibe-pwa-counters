import React, { useState } from 'react';

type View = 'left' | 'middle' | 'right';

const App: React.FC = () => {
    const [view, setView] = useState<View>('left');

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            {/* View Containers */}
            <div 
                id="left-page" 
                className="page" 
                style={{ display: view === 'left' ? 'block' : 'none' }}
            >
                {/* Content for Left Page will go here in Phase 3 */}
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    Left Page Content (Soon)
                </div>
            </div>

            <div 
                id="middle-page" 
                className="page" 
                style={{ 
                    display: view === 'middle' ? 'flex' : 'none',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    width: '90%',
                    margin: 'auto',
                    height: '100%',
                    fontSize: '200%'
                }}
            >
                Statistics are not implemented yet, but they will arrive in a future update.
            </div>

            <div 
                id="right-page" 
                className="page" 
                style={{ 
                    display: view === 'right' ? 'flex' : 'none',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '1.5em',
                    width: '90%',
                    margin: '0 auto',
                    height: '100%'
                }}
            >
                {/* Content for Right Page will go here in Phase 5 */}
                <div style={{ marginBottom: '20px' }}>
                    Account Info (Soon)
                </div>
            </div>

            {/* Basic Navigation (Placeholder for Phase 2) */}
            <div 
                className="page-selector" 
                style={{ 
                    position: 'fixed',
                    bottom: '0',
                    left: '0',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-around',
                    padding: '10px 0',
                    background: '#fff',
                    boxShadow: '0 -2px 5px rgba(0,0,0,0.1)'
                }}
            >
                <button onClick={() => setView('left')}>Left</button>
                <button onClick={() => setView('middle')}>Middle</button>
                <button onClick={() => setView('right')}>Right</button>
            </div>
        </div>
    );
};

export default App;
