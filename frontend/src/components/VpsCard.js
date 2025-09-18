import React, { useState } from 'react';

export default function VpsCard({ vps, onAction, onSSH }) {
  const [sshLink, setSshLink] = useState('');

  const handleSSH = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/v1/vps/${vps.id}/ssh`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setSshLink(data.ssh);
    if (data.ssh && !data.ssh.includes('...')) {
      navigator.clipboard.writeText(data.ssh);
      alert('SSH link copied to clipboard!');
    }
  };

  return (
    <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 shadow-lg rounded-2xl p-5 m-3 w-80 hover:scale-105 transition-transform duration-300">
      <h3 className="text-xl font-bold mb-2">🖥️ {vps.name}</h3>
      <p className="text-sm text-gray-600">Owner: {vps.owner}</p>
      <p className="text-sm text-gray-600">☎️ Support: {vps.support}</p>
      <p className="text-xs text-gray-500 mt-1">🕒 {new Date(vps.created_at).toLocaleString()}</p>
      <div className="badge badge-primary mt-2">{vps.status}</div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={() => onAction("start")} className="btn btn-success btn-xs">▶ Start</button>
        <button onClick={() => onAction("stop")} className="btn btn-error btn-xs">⏹ Stop</button>
        <button onClick={() => onAction("restart")} className="btn btn-warning btn-xs">🔄 Restart</button>
        <button onClick={handleSSH} className="btn btn-info btn-xs">💻 Terminal</button>
        <button onClick={() => onAction("reinstall")} className="btn btn-secondary btn-xs">♻️ Reinstall</button>
      </div>
      {sshLink && <p className="text-xs mt-2 break-all bg-white p-2 rounded">{sshLink}</p>}
    </div>
  );
}
