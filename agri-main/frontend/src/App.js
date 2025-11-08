import React, { useState } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setCurrentView('login');
  };

  if (isLoggedIn && user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="container">
      <div className="auth-card">
        {currentView === 'login' ? (
          <Login 
            switchToSignup={() => setCurrentView('signup')}
            onLogin={handleLogin}
          />
        ) : (
          <Signup 
            switchToLogin={() => setCurrentView('login')}
          />
        )}
      </div>
    </div>
  );
}

export default App;