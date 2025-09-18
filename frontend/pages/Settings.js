import React, { useState, useEffect } from 'react';
import Loader from '../components/Loader';

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
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
      await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username, password, role })
      });
      fetchUsers();
    } catch (err) {
      alert('Failed to create user');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">⚙️ Admin Settings</h2>

      <div className="card bg-white shadow-xl p-6 mb-8">
        <h3 className="text-xl font-bold mb-4">➕ Create User</h3>
        <form onSubmit={handleCreateUser} className="flex gap-2">
          <input type="text" name="username" placeholder="Username" className="input input-bordered" required />
          <input type="password" name="password" placeholder="Password" className="input input-bordered" required />
          <select name="role" className="select select-bordered">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn btn-primary">Create</button>
        </form>
      </div>

      <div className="card bg-white shadow-xl p-6">
        <h3 className="text-xl font-bold mb-4">👥 Users</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.role}</td>
                  <td>
                    <button onClick={() => handleDeleteUser(user.id)} className="btn btn-error btn-xs">🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
