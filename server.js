/**
 * Nordic Nature — Express + PostgreSQL API
 * Auth (JWT), Products CRUD, Settings, Users admin, Orders, Email notifications
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

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
      hero_desc TEXT,
      paytr_test_mode INT DEFAULT 1,
      paytr_callback_url TEXT
    );
  `);
  // Add columns if missing (migrations-lite)
  await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS paytr_test_mode INT DEFAULT 1;`);
  await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS paytr_callback_url TEXT;`);

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
      `INSERT INTO settings (id, site_title, hero_title, hero_desc, paytr_test_mode, paytr_callback_url) VALUES (TRUE, $1, $2, $3, 1, $4)`,
      ['Nordic Nature', 'Mountain Landscape', 'Majestic peaks covered in snow during golden hour', process.env.PAYTR_CALLBACK_FULL_URL || null]
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

// Email (nodemailer)
const nodemailer = require('nodemailer');
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@example.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

let transporter = null;
if (SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
  });
}

async function sendOrderEmails(order, items) {
  if (!transporter) return;
  const lines = items.map(it => `- ${it.name} x ${it.qty} — ₺${Number(it.price).toFixed(2)}`).join('\n');
  const summary =
`Sipariş Numaranız: #${order.id}
Merhaba ${order.name},

Siparişiniz alındı. Detaylar:

${lines}

Ara Toplam: ₺${Number(order.subtotal).toFixed(2)}
Kargo: ₺${Number(order.shipping).toFixed(2)}
Toplam: ₺${Number(order.total).toFixed(2)}

Teslimat:
${order.address}
${order.city} ${order.postal_code}

Teşekkürler,
Nordic Nature`;

  await transporter.sendMail({
    from: SMTP_FROM,
    to: order.email,
    subject: `Sipariş Alındı — #${order.id}`,
    text: summary
  });

  if (ADMIN_EMAIL) {
    const adminText =
`Yeni Sipariş: #${order.id}
Müşteri: ${order.name} <${order.email}>
Toplam: ₺${Number(order.total).toFixed(2)}

Ürünler:
${lines}

Adres:
${order.address}
${order.city} ${order.postal_code}
`;
    await transporter.sendMail({
      from: SMTP_FROM,
      to: ADMIN_EMAIL,
      subject: `Yeni Sipariş — #${order.id}`,
      text: adminText
    });
  }
}

async function sendRefundEmail(order, amount) {
  if (!transporter) return;
  const text =
`İade Bildirimi — #${order.id}
Merhaba ${order.name},

Siparişiniz için ₺${amount.toFixed(2)} tutarında iade işlemi gerçekleştirilmiştir.

İyi günler,
Nordic Nature`;

  await transporter.sendMail({
    from: SMTP_FROM,
    to: order.email,
    subject: `İade İşlemi — #${order.id}`,
    text
  });

  if (ADMIN_EMAIL) {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: ADMIN_EMAIL,
      subject: `İade İşlemi — #${order.id}`,
      text: `Sipariş #${order.id} için ₺${amount.toFixed(2)} iade edildi. Müşteri: ${order.name} <${order.email}>`
    });
  }
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
    const r = await pool.query(`SELECT site_title, hero_title, hero_desc, paytr_test_mode, paytr_callback_url FROM settings WHERE id = TRUE`);
    res.json(r.rows[0] || {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/settings', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { site_title, hero_title, hero_desc, paytr_test_mode, paytr_callback_url } = req.body;
    await pool.query(
      `UPDATE settings SET site_title=$1, hero_title=$2, hero_desc=$3, paytr_test_mode=COALESCE($4, paytr_test_mode), paytr_callback_url=COALESCE($5, paytr_callback_url) WHERE id = TRUE`,
      [site_title, hero_title, hero_desc, paytr_test_mode, paytr_callback_url]
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

    // Send emails (non-blocking)
    sendOrderEmails(
      { id: orderId, name, email, address, city, postal_code, subtotal, shipping, total },
      normalized
    ).catch(() => {});

    res.json({ orderId, subtotal, shipping, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Refund (Admin) — PAYTR Refund API (supports partial refund)
app.post('/api/orders/:id/refund', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const amountReq = req.body?.amount;

    // load order and check status
    const r = await pool.query(`SELECT id, status, total, email, name FROM orders WHERE id=$1`, [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const order = r.rows[0];
    if (order.status !== 'paid') return res.status(400).json({ error: 'Only paid orders can be refunded' });

    // credentials
    const MERCHANT_ID = process.env.PAYTR_MERCHANT_ID;
    const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY;
    const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT;
    if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
      return res.status(400).json({ error: 'PAYTR credentials not configured' });
    }

    // compute return_amount (string with dot)
    let amount = Number(amountReq || order.total);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (amount > Number(order.total)) amount = Number(order.total);
    const return_amount = amount.toFixed(2); // e.g. "123.45"

    // Token: base64(hmac_sha256(merchant_id + merchant_oid + return_amount + merchant_salt, merchant_key))
    const crypto = require('crypto');
    const token = Buffer.from(
      crypto.createHmac('sha256', MERCHANT_KEY)
        .update(String(MERCHANT_ID) + String(id) + String(return_amount) + String(MERCHANT_SALT), 'utf8')
        .digest()
    ).toString('base64');

    const params = new URLSearchParams({
      merchant_id: MERCHANT_ID,
      merchant_oid: String(id),
      return_amount,
      paytr_token: token
    });

    const fetchMod = await import('node-fetch');
    const fetch = fetchMod.default;
    const refundUrl = process.env.PAYTR_REFUND_URL || 'https://www.paytr.com/odeme/iade';
    const resp = await fetch(refundUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await resp.json().catch(async () => {
      const text = await resp.text();
      return { status: 'error', err_msg: text };
    });

    if (data && data.status === 'success') {
      // Full iade ise statüyü refunded'e çekelim. (Kısmi iade ise statüyü paid bırakmak tercih edilir.)
      if (Number(return_amount) >= Number(order.total)) {
        await pool.query(`UPDATE orders SET status='refunded' WHERE id=$1`, [id]);
      }
      // E-posta bildirimi
      sendRefundEmail(order, Number(return_amount)).catch(() => {});
      return res.json({ ok: true, reference_no: data.reference_no || null });
    } else {
      return res.status(400).json({ error: data?.err_msg || 'PAYTR refund error' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PAYTR init (returns token if configured)
app.post('/api/paytr/init', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

    const MERCHANT_ID = process.env.PAYTR_MERCHANT_ID;
    const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY;
    const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT;
    if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
      return res.json({ enabled: false, reason: 'PAYTR credentials not configured' });
    }

    // Settings override for test_mode and callback
    const s = await pool.query(`SELECT paytr_test_mode, paytr_callback_url FROM settings WHERE id = TRUE`);
    const TEST_MODE = s.rows[0]?.paytr_test_mode ?? Number(process.env.PAYTR_TEST_MODE || 0);
    const CALLBACK_URL = s.rows[0]?.paytr_callback_url || process.env.PAYTR_CALLBACK_FULL_URL || '';

    // Load order totals
    const or = await pool.query(`SELECT id, email, name, total, address, city, postal_code FROM orders WHERE id=$1`, [orderId]);
    if (or.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = or.rows[0];

    // Prepare PAYTR fields
    const user_ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    const merchant_oid = String(orderId);
    const email = order.email;
    const payment_amount = Math.round(Number(order.total) * 100); // TL -> kuruş
    const payment_type = 'card';
    const installment_count = 1;
    const currency = 'TL';
    const test_mode = Number(TEST_MODE) ? 1 : 0;
    const non_3d = 0;
    const user_name = order.name || '';
    const user_address = `${order.address}, ${order.city} ${order.postal_code}`;
    const user_phone = ''; // optional
    const merchant_ok_url = `${req.protocol}://${req.get('host')}/index.html#ok`;
    const merchant_fail_url = `${req.protocol}://${req.get('host')}/index.html#fail`;
    const no_installment = 0;
    const max_installment = 12;
    const debug_on = test_mode ? 1 : 0;
    const callback_url = CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/paytr/callback`;

    // Basket: basic single-line
    const basket = [[`Sipariş #${orderId}`, (payment_amount/100).toFixed(2), 1]];
    const user_basket = Buffer.from(JSON.stringify(basket)).toString('base64');

    // Token
    const hash_str = MERCHANT_ID + user_ip + merchant_oid + email + payment_amount + payment_type + installment_count + currency + test_mode + non_3d;
    const crypto = require('crypto');
    const paytr_token = Buffer.from(
      crypto.createHmac('sha256', MERCHANT_KEY)
        .update(hash_str + MERCHANT_SALT, 'utf8')
        .digest()
    ).toString('base64');

    // Request token from PAYTR
    const params = new URLSearchParams({
      merchant_id: MERCHANT_ID,
      user_ip,
      merchant_oid,
      email,
      payment_amount: String(payment_amount),
      payment_type,
      installment_count: String(installment_count),
      currency,
      test_mode: String(test_mode),
      non_3d: String(non_3d),
      paytr_token,
      user_name,
      user_address,
      user_phone,
      merchant_ok_url,
      merchant_fail_url,
      user_basket,
      no_installment: String(no_installment),
      max_installment: String(max_installment),
      debug_on: String(debug_on),
      callback_url
    });

    const fetchMod = await import('node-fetch');
    const fetch = fetchMod.default;
    const resp = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await resp.json().catch(async () => {
      const text = await resp.text();
      return { status: 'error', err_msg: text };
    });

    if (data && data.status === 'success' && data.token) {
      return res.json({ enabled: true, token: data.token });
    } else {
      return res.json({ enabled: false, reason: data?.err_msg || 'PAYTR token error' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PAYTR callback (server-to-server)
app.post('/api/paytr/callback', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY || '';
    const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT || '';
    const { merchant_oid, status, total_amount, hash } = req.body || {};
    if (!merchant_oid) return res.status(400).send('missing merchant_oid');

    // merchant_oid olarak orderId kullandığımızı varsayalım
    const orderId = parseInt(merchant_oid, 10);
    if (!orderId) return res.status(400).send('invalid oid');

    // Hash doğrulaması (PAYTR dokümantasyonuna göre)
    // Varsayılan formül: base64(hmac_sha256(merchant_oid + merchant_salt + status + total_amount, merchant_key))
    if (MERCHANT_KEY && MERCHANT_SALT) {
      const crypto = require('crypto');
      const verifyStr = String(merchant_oid) + String(MERCHANT_SALT) + String(status) + String(total_amount || '');
      const computed = Buffer.from(
        crypto.createHmac('sha256', MERCHANT_KEY)
          .update(verifyStr, 'utf8')
          .digest()
      ).toString('base64');

      if (!hash || hash !== computed) {
        // Hash uyuşmazlığı
        return res.status(401).send('invalid hash');
      }
    }

    if (status === 'success') {
      await pool.query(`UPDATE orders SET status='paid' WHERE id=$1`, [orderId]);
      return res.status(200).send('OK');
    } else {
      await pool.query(`UPDATE orders SET status='cancelled' WHERE id=$1`, [orderId]);
      return res.status(200).send('OK');
    }
  } catch (e) {
    console.error(e);
    return res.status(500).send('error');
  }
});

// Order status (for frontend polling)
app.get('/api/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(`SELECT id, user_id, status FROM orders WHERE id = $1`, [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const row = r.rows[0];
    if (row.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json({ status: row.status });
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

app.get('/api/orders/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const or = await pool.query(
      `SELECT id, email, name, address, city, postal_code, subtotal, shipping, total, status, created_at
       FROM orders WHERE id = $1`,
      [id]
    );
    if (or.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const items = await pool.query(
      `SELECT product_id, name, image, price, qty FROM order_items WHERE order_id = $1`,
      [id]
    );
    res.json({ order: or.rows[0], items: items.rows });
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