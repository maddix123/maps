const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'app.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS saved_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    country TEXT NOT NULL,
    width_mm REAL NOT NULL,
    height_mm REAL NOT NULL,
    image_data TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'passport-photo-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

const createUserStmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
const findUserByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const findUserByIdStmt = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?');
const savePhotoStmt = db.prepare(
  'INSERT INTO saved_photos (user_id, country, width_mm, height_mm, image_data) VALUES (?, ?, ?, ?, ?)'
);
const listPhotosStmt = db.prepare(
  'SELECT id, country, width_mm, height_mm, image_data, created_at FROM saved_photos WHERE user_id = ? ORDER BY created_at DESC'
);

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return next();
};

app.post('/api/signup', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Valid email and password (min 6 chars) are required' });
  }

  const existing = findUserByEmailStmt.get(email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = createUserStmt.run(email.trim().toLowerCase(), hash);
  req.session.userId = result.lastInsertRowid;

  return res.json({
    message: 'Signup successful',
    user: { id: Number(result.lastInsertRowid), email: email.trim().toLowerCase() }
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = findUserByEmailStmt.get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  return res.json({ message: 'Login successful', user: { id: user.id, email: user.email } });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  const user = findUserByIdStmt.get(req.session.userId);
  return res.json({ user: user || null });
});

app.post('/api/save', requireAuth, (req, res) => {
  const { country, widthMm, heightMm, imageData } = req.body;

  if (!country || !widthMm || !heightMm || !imageData || !imageData.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid save payload' });
  }

  const info = savePhotoStmt.run(req.session.userId, country, widthMm, heightMm, imageData);
  return res.json({ message: 'Saved', id: Number(info.lastInsertRowid) });
});

app.get('/api/saved', requireAuth, (req, res) => {
  const items = listPhotosStmt.all(req.session.userId);
  return res.json({ items });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Passport Photo Generator running at http://localhost:${PORT}`);
});
