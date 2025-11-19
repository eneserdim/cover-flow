/**
 * Nordic Nature — Express + PostgreSQL API
 * Auth (JWT), Products CRUD, Settings, Users admin, Orders
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const DATABASE_URL = process.env.DATABASE_URL;

// Postgres pool
const pool = new Pool(
  DATABASE_URL
    ? { connectionString: DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'nordic_nature'
      }
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (serve the site)
app.use(express.static(path.join(__dirname)));

// DB init
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image TEXT NOT NULL,
      price NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id BOOLEAN PRIMARY KEY DEFAULT TRUE,
      site_title TEXT,
      hero_title TEXT,
      hero_desc TEXT
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      subtotal NUMERIC(12,2) NOT NULL,
      shipping NUMERIC(12,2) NOT NULL,
      total NUMERIC(12,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      image TEXT NOT NULL,
      price NUMERIC(12,2) NOT NULL,
      qty INTEGER NOT NULL
    );
  `);

  // Ensure settings single row
  const res = await pool.query(`SELECT id FROM settings WHERE id = TRUE`);
  if (res.rows.length === 0) {
    await pool.query(
      `INSERT INTO settings (id, site_title, hero_title, hero_desc) VALUES (TRUE, $1, $2, $3)`,
      ['Nordic Nature', 'Mountain Landscape', 'Majestic peaks covered in snow during golden hour']
    );
  }
}

// Auth helpers
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function getUserByEmail(email) {
  const r = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return r.rows[0] || null;
}

async function getUsersCount() {
  const r = await pool.query(`SELECT COUNT(*)::int AS c FROM users`);
  return r.rows[0].c || 0;
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

// Routes

// Auth
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const existing = await getUserByEmail(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email already exists' });
    const count = await getUsersCount();
    const role = count === 0 ? 'admin' : 'user';
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role`,
      [name || '', email.toLowerCase(), hash, role]
    );
    const user = r.rows[0];
    const token = signToken(user);
    res.json({ token, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const r = await pool.query(`SELECT id, name, image, price FROM products ORDER BY name ASC`);
    res.json({ products: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/products', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id, name, image, price } = req.body;
    if (!id || !name || !image || !price) return res.status(400).json({ error: 'Missing fields' });
    await pool.query(
      `INSERT INTO products (id, name, image, price) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, image = EXCLUDED.image, price = EXCLUDED.price`,
      [id, name, image, price]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/products/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, price } = req.body;
    await pool.query(
      `UPDATE products SET name=$2, image=$3, price=$4 WHERE id=$1`,
      [id, name, image, price]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/products/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM products WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const r = await pool.query(`SELECT site_title, hero_title, hero_desc FROM settings WHERE id = TRUE`);
    res.json(r.rows[0] || {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/settings', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { site_title, hero_title, hero_desc } = req.body;
    await pool.query(
      `UPDATE settings SET site_title=$1, hero_title=$2, hero_desc=$3 WHERE id = TRUE`,
      [site_title, hero_title, hero_desc]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Users (Admin)
app.get('/api/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC`);
    res.json({ users: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, name } = req.body;
    if (!role) return res.status(400).json({ error: 'Missing role' });
    await pool.query(`UPDATE users SET role=$2, name=COALESCE($3, name) WHERE id=$1`, [id, role, name || null]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM users WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Orders
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { name, email, address, city, postal_code, items } = req.body;
    if (!name || !email || !address || !city || !postal_code || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Fetch products and compute totals
    const ids = items.map(i => i.id);
    const r = await pool.query(`SELECT id, name, image, price FROM products WHERE id = ANY($1::text[])`, [ids]);
    const map = new Map(r.rows.map(p => [p.id, p]));
    let subtotal = 0;
    const normalized = [];
    for (const it of items) {
      const p = map.get(it.id);
      if (!p) return res.status(400).json({ error: `Product not found: ${it.id}` });
      const qty = Math.max(1, parseInt(it.qty || 1, 10));
      const price = Number(p.price);
      subtotal += price * qty;
      normalized.push({ product_id: p.id, name: p.name, image: p.image, price, qty });
    }
    const shipping = subtotal > 1000 ? 0 : (subtotal > 0 ? 49.90 : 0);
    const total = subtotal + shipping;

    // Create order
    const or = await pool.query(
      `INSERT INTO orders (user_id, email, name, address, city, postal_code, subtotal, shipping, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [req.user?.id || null, email, name, address, city, postal_code, subtotal, shipping, total]
    );
    const orderId = or.rows[0].id;

    // Insert items
    const values = [];
    const params = [];
    let idx = 1;
    normalized.forEach(it => {
      params.push(orderId, it.product_id, it.name, it.image, it.price, it.qty);
      values.push(`(${idx++}, ${idx++}, ${idx++}, ${idx++}, ${idx++}, ${idx++})`);
    });
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, name, image, price, qty) VALUES ${values.join(',')}`,
      params
    );

    res.json({ orderId, subtotal, shipping, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders/mine', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, email, name, address, city, postal_code, subtotal, shipping, total, status, created_at
       FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders', authMiddleware, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT o.id, o.email, o.name, o.subtotal, o.shipping, o.total, o.status, o.created_at, u.email as user_email
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC LIMIT 200`
    );
    res.json({ orders: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/orders/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Missing status' });
    await pool.query(`UPDATE orders SET status=$2 WHERE id=$1`, [id, status]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fallback to index.html for SPA-like routing if needed
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('DB init error:', e);
    process.exit(1);
  });

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('DB init error:', e);
    process.exit(1);
  });

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('DB init error:', e);
    process.exit(1);
  });