import React, { useState, useEffect } from 'react';
import Loader from './Loader';

export default function AdminPanel({ token, onVpsCreated }) {
  const [users, setUsers] = useState([]);
  const [vpsList, setVpsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newVps, setNewVps] = useState({ name: '', owner: '', support: '' });

  useEffect(() => {
    fetchUsers();
    fetchAllVps();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchAllVps = async () => {
    try {
      const res = await fetch('/api/v1/vps', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setVpsList(data);
    } catch (err) {
      console.error('Failed to fetch VPS list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const role = e.target.role.value;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username, password, role })
      });
      if (res.ok) {
        alert('User created successfully!');
        fetchUsers(); // Refresh user list
        e.target.reset();
      } else {
        const error = await res.json();
        alert('Failed to create user: ' + error.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('⚠️ Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('User deleted successfully!');
        fetchUsers();
      } else {
        const error = await res.json();
        alert('Failed to delete user: ' + error.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const handleCreateVps = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/vps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newVps)
      });
      const data = await res.json();
      if (res.ok) {
        alert('VPS created successfully!');
        setNewVps({ name: '', owner: '', support: '' });
        fetchAllVps();
        if (onVpsCreated) onVpsCreated();
      } else {
        const error = await res.json();
        alert('Failed to create VPS: ' + error.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const handleSuspendVps = async (id) => {
    if (!confirm('⏸️ Are you sure you want to stop this VPS?')) return;
    try {
      const res = await fetch(`/api/v1/vps/${id}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('VPS stopped successfully!');
        fetchAllVps();
      } else {
        const error = await res.json();
        alert('Failed to stop VPS: ' + error.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const handleDeleteVps = async (id) => {
    if (!confirm('🗑️ Are you sure you want to PERMANENTLY DELETE this VPS? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/v1/vps/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('VPS deleted successfully!');
        fetchAllVps();
      } else {
        const error = await res.json();
        alert('Failed to delete VPS: ' + error.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-8">
      {/* Create New VPS Section */}
      <div className="card bg-white shadow-xl p-6">
        <h3 className="text-2xl font-bold mb-4 flex items-center">
          <span>🆕</span>
          <span className="ml-2">Create New VPS</span>
        </h3>
        <form onSubmit={handleCreateVps} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="VPS Name (e.g., my-vps-01)"
            className="input input-bordered"
            value={newVps.name}
            onChange={(e) => setNewVps({ ...newVps, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Owner Username"
            className="input input-bordered"
            value={newVps.owner}
            onChange={(e) => setNewVps({ ...newVps, owner: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Support Number/ID"
            className="input input-bordered"
            value={newVps.support}
            onChange={(e) => setNewVps({ ...newVps, support: e.target.value })}
            required
          />
          <button type="submit" className="btn btn-primary col-span-1 md:col-span-3">
            💖 Create VPS
          </button>
        </form>
      </div>

      {/* Manage Users Section */}
      <div className="card bg-white shadow-xl p-6">
        <h3 className="text-2xl font-bold mb-4 flex items-center">
          <span>👥</span>
          <span className="ml-2">Manage Users</span>
        </h3>
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-2">➕ Add New User</h4>
          <form onSubmit={handleCreateUser} className="flex flex-col sm:flex-row gap-2">
            <input type="text" name="username" placeholder="Username" className="input input-bordered flex-1" required />
            <input type="password" name="password" placeholder="Password" className="input input-bordered flex-1" required />
            <select name="role" className="select select-bordered w-full sm:w-auto">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="btn btn-primary whitespace-nowrap">Create User</button>
          </form>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-2">📋 User List</h4>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-error' : 'badge-primary'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleDeleteUser(user.id)} className="btn btn-error btn-xs">
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manage VPS Section */}
      <div className="card bg-white shadow-xl p-6">
        <h3 className="text-2xl font-bold mb-4 flex items-center">
          <span>🖥️</span>
          <span className="ml-2">Manage All VPS Instances</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vpsList.map(vps => (
                <tr key={vps.id}>
                  <td>{vps.name}</td>
                  <td>{vps.owner}</td>
                  <td>
                    <span className={`badge ${vps.status === 'running' ? 'badge-success' : 'badge-error'}`}>
                      {vps.status}
                    </span>
                  </td>
                  <td>{new Date(vps.created_at).toLocaleString()}</td>
                  <td className="space-x-2">
                    <button onClick={() => handleSuspendVps(vps.id)} className="btn btn-warning btn-xs">
                      ⏸️ Suspend
                    </button>
                    <button onClick={() => handleDeleteVps(vps.id)} className="btn btn-error btn-xs">
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
