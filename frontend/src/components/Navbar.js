import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const token = localStorage.getItem('token');
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <nav className="bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500 p-4 rounded-xl shadow-lg mb-8">
      <div className="flex justify-between items-center">
        <h1 className="text-white text-2xl font-bold">💖 nxh-i7 VPS Panel</h1>
        <div className="space-x-4">
          {token && (
            <>
              <Link to="/" className="text-white hover:underline">🖥️ Dashboard</Link>
              <Link to="/settings" className="text-white hover:underline">⚙️ Settings</Link>
              <button onClick={handleLogout} className="text-white hover:underline">🚪 Logout</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
