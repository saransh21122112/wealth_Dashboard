const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');

let client;

function getClient() {
  if (client) return client;

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    console.log('[DB] Connected to Turso remote database.');
    client = createClient({ url: tursoUrl, authToken: tursoToken });
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.error('[DB] WARNING: TURSO_DATABASE_URL is not set in production! Falling back to local SQLite — all data will be lost on restart/redeploy.');
    } else {
      console.log('[DB] No TURSO_DATABASE_URL set. Using local SQLite file.');
    }
    const dataDir = path.resolve(__dirname, '../../data');
    fs.mkdirSync(dataDir, { recursive: true });
    client = createClient({ url: `file:${path.join(dataDir, 'aurelia.db')}` });
  }

  return client;
}

async function run(sql, params = []) {
  const result = await getClient().execute({ sql, args: params });
  return { lastID: Number(result.lastInsertRowid), changes: result.rowsAffected };
}

async function get(sql, params = []) {
  const result = await getClient().execute({ sql, args: params });
  return result.rows[0] ?? null;
}

async function all(sql, params = []) {
  const result = await getClient().execute({ sql, args: params });
  return result.rows;
}

async function initializeDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      is_recurring INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS investments (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      amount REAL NOT NULL,
      rate REAL NOT NULL,
      compounding TEXT NOT NULL,
      duration INTEGER NOT NULL,
      lic_policy_num TEXT,
      lic_sum_assured REAL,
      lic_premium_freq TEXT,
      lic_premium_due TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      is_recurring INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Lends table
  await run(`
    CREATE TABLE IF NOT EXISTS lends (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      person TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      due_date TEXT,
      note TEXT,
      returned INTEGER NOT NULL DEFAULT 0,
      returned_amount REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Migrations — safe ALTER TABLE statements, each wrapped individually
  const migrations = [
    'ALTER TABLE sessions ADD COLUMN expires_at TEXT',
    'ALTER TABLE users ADD COLUMN cash_balance_amount REAL DEFAULT 0',
    'ALTER TABLE users ADD COLUMN cash_balance_note TEXT',
    'ALTER TABLE users ADD COLUMN cash_balance_updated_at TEXT',
    'ALTER TABLE income ADD COLUMN recurring_day INTEGER',
    'ALTER TABLE expenses ADD COLUMN recurring_day INTEGER',
    'ALTER TABLE expenses ADD COLUMN end_date TEXT',
    'ALTER TABLE investments ADD COLUMN end_date TEXT',
    'ALTER TABLE investments ADD COLUMN recurring_day INTEGER'
  ];
  for (const sql of migrations) {
    try { await run(sql); } catch (_e) { /* column already exists — safe to ignore */ }
  }

  const countRow = await get('SELECT COUNT(*) AS count FROM users');
  if (Number(countRow.count) === 0) {
    let adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      adminPassword = crypto.randomBytes(12).toString('base64url');
      console.warn(`[Aurelia] ADMIN_PASSWORD not set. Generated one-time password for admin: ${adminPassword}`);
    }
    const hashed = await bcrypt.hash(adminPassword, 12);
    await run(
      'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)',
      ['admin', hashed, 'admin', new Date().toISOString()]
    );
  }
}

async function batch(statements) {
  return getClient().batch(statements, 'write');
}

module.exports = {
  run,
  get,
  all,
  batch,
  initializeDatabase
};
