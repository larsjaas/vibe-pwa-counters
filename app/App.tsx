// src/App.tsx
import React, { useState } from 'react';
import { NavBar } from './components/NavBar';

function App() {
  const [view, setView] = useState('home');

  const renderContent = () => {
    switch (view) {
      case 'home':
        return <div style={{ padding: '20px' }}><h1>🏠 Welcome Home</h1><p>This is your main dashboard.</p></div>;
      case 'settings':
        return <div style={{ padding: '20px' }}><h1>⚙️  Settings</h1><p>Adjust your preferences here.</p></div>;
      case 'profile':
        return <div style={{ padding: '20px' }}><h1>👤 Profile</h1><p>Manage your account details.</p></div>;
      default:
        return <div style={{ padding: '20px' }}><h1>404</h1><p>Page not found.</p></div>;
    }
  };

  return (
    <div style={{
      fontFamily: 'sans-serif',
      paddingBottom: '70px', // Space for the fixed navbar
      minHeight: '100vh',
      backgroundColor: '#f9fafb'
    }}>
      {renderContent()}
      <NavBar currentView={view} setView={setView} />
    </div>
  );
}

export default App;
