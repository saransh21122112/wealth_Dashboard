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
    client = createClient({ url: tursoUrl, authToken: tursoToken });
  } else {
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
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

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

module.exports = {
  run,
  get,
  all,
  initializeDatabase
};
