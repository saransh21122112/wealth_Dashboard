const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.resolve(__dirname, '../../data');
const dbPath = path.join(dataDir, 'aurelia.db');

const defaultUsers = [
  { username: 'user', password: 'user123', role: 'user' },
  { username: 'john', password: 'john123', role: 'user' },
  { username: 'admin', password: 'admin123', role: 'admin' }
];

let db;

function openDatabase() {
  if (db) return db;

  fs.mkdirSync(dataDir, { recursive: true });
  db = new sqlite3.Database(dbPath);
  return db;
}

function run(sql, params = []) {
  const database = openDatabase();
  return new Promise((resolve, reject) => {
    database.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  const database = openDatabase();
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  const database = openDatabase();
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

async function initializeDatabase() {
  openDatabase();

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
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  const countRow = await get('SELECT COUNT(*) AS count FROM users');
  if (countRow.count === 0) {
    for (const user of defaultUsers) {
      await run(
        'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)',
        [user.username, user.password, user.role, new Date().toISOString()]
      );
    }
  }
}

module.exports = {
  run,
  get,
  all,
  initializeDatabase
};