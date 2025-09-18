import React, { useState, useEffect } from 'react';
import VpsCard from '../components/VpsCard';
import Loader from '../components/Loader';

export default function Dashboard() {
  const [vpsList, setVpsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return window.location.href = '/login';
    fetchVps();
  }, []);

  const fetchVps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/vps', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setVpsList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      await fetch(`/api/v1/vps/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVps(); // Refresh
    } catch (err) {
      alert('Action failed: ' + err.message);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">💖 Your VPS Instances</h2>
      <div className="flex flex-wrap">
        {vpsList.length === 0 ? (
          <p className="text-gray-500">No VPS found. Ask admin to create one!</p>
        ) : (
          vpsList.map(vps => (
            <VpsCard
              key={vps.id}
              vps={vps}
              onAction={(action) => handleAction(vps.id, action)}
              onSSH={() => {}}
            />
          ))
        )}
      </div>
    </div>
  );
}
