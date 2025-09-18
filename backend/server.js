const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const Docker = require('dockerode');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'nxh-i7-secret-<3';

// Initialize DB
const db = new sqlite3.Database('./db.sqlite', (err) => {
  if (err) console.error('DB Error:', err.message);
  else {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user'
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS vps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        owner TEXT,
        support TEXT,
        container_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'stopped'
      )
    `);
  }
});

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

app.use(cors());
app.use(express.json());

// Middleware: Auth + Role Check
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

// Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, role: user.role });
  });
});

app.get('/api/v1/vps', authenticateToken, (req, res) => {
  const query = req.user.role === 'admin' ? 'SELECT * FROM vps' : 'SELECT * FROM vps WHERE owner = ?';
  db.all(query, req.user.role === 'admin' ? [] : [req.user.username], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/v1/vps', authenticateToken, isAdmin, async (req, res) => {
  const { name, owner, support } = req.body;
  try {
    // Build image if not exists
    await docker.buildImage(
      { context: __dirname, src: ['Dockerfile.vps', 'vps-entrypoint.sh'] },
      { t: 'nxh-i7/ubuntu22.04-tmate' },
      (err, stream) => {
        if (err) return console.error(err);
        docker.modem.followProgress(stream, (err, res) => {
          if (err) console.error(err);
        });
      }
    );

    const container = await docker.createContainer({
      Image: 'nxh-i7/ubuntu22.04-tmate',
      name: name,
      Tty: true,
      HostConfig: {
        Memory: 512 * 1024 * 1024, // 512MB
        CpuPeriod: 100000,
        CpuQuota: 50000, // 0.5 CPU
        RestartPolicy: { Name: 'unless-stopped' }
      },
      Env: [`SUPPORT_NUMBER=${support}`]
    });

    await container.start();
    db.run(
      'INSERT INTO vps (name, owner, support, container_id, status) VALUES (?, ?, ?, ?, ?)',
      [name, owner, support, container.id, 'running'],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'VPS created', id: container.id });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/vps/:id/:action', authenticateToken, async (req, res) => {
  const { id, action } = req.params;
  const query = req.user.role === 'admin' ? 'SELECT * FROM vps WHERE id = ?' : 'SELECT * FROM vps WHERE id = ? AND owner = ?';
  db.get(query, req.user.role === 'admin' ? [id] : [id, req.user.username], async (err, vps) => {
    if (err || !vps) return res.status(404).json({ error: 'VPS not found' });

    try {
      const container = docker.getContainer(vps.container_id);
      if (action === 'start') {
        await container.start();
        db.run('UPDATE vps SET status = ? WHERE id = ?', ['running', id]);
      } else if (action === 'stop') {
        await container.stop();
        db.run('UPDATE vps SET status = ? WHERE id = ?', ['stopped', id]);
      } else if (action === 'restart') {
        await container.restart();
      } else if (action === 'reinstall') {
        await container.remove({ force: true });
        // Recreate same container
        const newContainer = await docker.createContainer({
          Image: 'nxh-i7/ubuntu22.04-tmate',
          name: vps.name,
          Tty: true,
          HostConfig: {
            Memory: 512 * 1024 * 1024,
            CpuPeriod: 100000,
            CpuQuota: 50000,
            RestartPolicy: { Name: 'unless-stopped' }
          },
          Env: [`SUPPORT_NUMBER=${vps.support}`]
        });
        await newContainer.start();
        db.run('UPDATE vps SET container_id = ?, status = ? WHERE id = ?', [newContainer.id, 'running', id]);
      }
      res.json({ message: `${action} successful` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

app.get('/api/v1/vps/:id/ssh', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const query = req.user.role === 'admin' ? 'SELECT * FROM vps WHERE id = ?' : 'SELECT * FROM vps WHERE id = ? AND owner = ?';
  db.get(query, req.user.role === 'admin' ? [id] : [id, req.user.username], async (err, vps) => {
    if (err || !vps) return res.status(404).json({ error: 'VPS not found' });
    try {
      const container = docker.getContainer(vps.container_id);
      const exec = await container.exec({
        Cmd: ['bash', '-c', 'tmate -F 2>&1 | grep -m 1 "ssh session" | awk \'{print $6}\''],
        AttachStdout: true,
        AttachStderr: true
      });
      exec.start((err, stream) => {
        if (err) return res.status(500).json({ error: err.message });
        let ssh = '';
        stream.on('data', (chunk) => { ssh += chunk.toString(); });
        stream.on('end', () => {
          res.json({ ssh: ssh.trim() || 'Starting tmate... try again in 10s' });
        });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

app.delete('/api/v1/vps/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM vps WHERE id = ?', [id], async (err, vps) => {
    if (err || !vps) return res.status(404).json({ error: 'VPS not found' });
    try {
      const container = docker.getContainer(vps.container_id);
      await container.remove({ force: true });
      db.run('DELETE FROM vps WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'VPS deleted' });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

app.get('/api/users', authenticateToken, isAdmin, (req, res) => {
  db.all('SELECT id, username, role FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/users', authenticateToken, isAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashed, role || 'user'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, username, role });
  });
});

app.delete('/api/users/:id', authenticateToken, isAdmin, (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'User deleted' });
  });
});

app.listen(PORT, () => {
  console.log(`💖 nxh-i7 Backend running on http://localhost:${PORT}`);
});
