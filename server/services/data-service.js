const crypto = require('crypto');
const { run, get, all } = require('../db/sqlite');

function mapExpense(row) {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    date: row.date,
    category: row.category,
    isRecurring: Boolean(row.is_recurring)
  };
}

function mapInvestment(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    startDate: row.start_date,
    amount: Number(row.amount),
    rate: Number(row.rate),
    compounding: row.compounding,
    duration: Number(row.duration),
    licPolicyNum: row.lic_policy_num || null,
    licSumAssured: row.lic_sum_assured == null ? null : Number(row.lic_sum_assured),
    licPremiumFreq: row.lic_premium_freq || null,
    licPremiumDue: row.lic_premium_due || null
  };
}

async function getUserByUsername(username) {
  return get('SELECT * FROM users WHERE username = ?', [username]);
}

async function getUserById(id) {
  return get('SELECT * FROM users WHERE id = ?', [id]);
}

async function getExpensesByUserId(userId) {
  const rows = await all('SELECT * FROM expenses WHERE user_id = ?', [userId]);
  return rows.map(mapExpense);
}

async function getInvestmentsByUserId(userId) {
  const rows = await all('SELECT * FROM investments WHERE user_id = ?', [userId]);
  return rows.map(mapInvestment);
}

async function buildUserPayload(userRow) {
  return {
    username: userRow.username,
    role: userRow.role,
    expenses: await getExpensesByUserId(userRow.id),
    investments: await getInvestmentsByUserId(userRow.id)
  };
}

async function createUser(username, password) {
  await run(
    'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)',
    [username, password, 'user', new Date().toISOString()]
  );
  return getUserByUsername(username);
}

async function createSession(userId) {
  const token = crypto.randomUUID();
  await run('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', [token, userId, new Date().toISOString()]);
  return token;
}

async function deleteSession(token) {
  await run('DELETE FROM sessions WHERE token = ?', [token]);
}

async function getSessionUser(token) {
  const session = await get('SELECT * FROM sessions WHERE token = ?', [token]);
  if (!session) return null;
  return getUserById(session.user_id);
}

async function replaceUserData(userId, expenses, investments) {
  await run('DELETE FROM expenses WHERE user_id = ?', [userId]);
  await run('DELETE FROM investments WHERE user_id = ?', [userId]);

  for (const expense of expenses) {
    await run(
      `INSERT INTO expenses (id, user_id, description, amount, date, category, is_recurring)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.id,
        userId,
        expense.description,
        Number(expense.amount),
        expense.date,
        expense.category,
        expense.isRecurring ? 1 : 0
      ]
    );
  }

  for (const investment of investments) {
    await run(
      `INSERT INTO investments (
        id, user_id, name, type, start_date, amount, rate, compounding, duration,
        lic_policy_num, lic_sum_assured, lic_premium_freq, lic_premium_due
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        investment.id,
        userId,
        investment.name,
        investment.type,
        investment.startDate,
        Number(investment.amount),
        Number(investment.rate),
        String(investment.compounding ?? '12'),
        Number(investment.duration ?? 10),
        investment.licPolicyNum ?? null,
        investment.licSumAssured == null ? null : Number(investment.licSumAssured),
        investment.licPremiumFreq ?? null,
        investment.licPremiumDue ?? null
      ]
    );
  }
}

async function getAllUsersWithData() {
  const users = await all('SELECT * FROM users ORDER BY username ASC');
  const payload = [];
  for (const user of users) {
    payload.push(await buildUserPayload(user));
  }
  return payload;
}

async function updateUserRole(username, role) {
  await run('UPDATE users SET role = ? WHERE username = ?', [role, username]);
  return getUserByUsername(username);
}

module.exports = {
  getUserByUsername,
  getUserById,
  buildUserPayload,
  createUser,
  createSession,
  deleteSession,
  getSessionUser,
  replaceUserData,
  getAllUsersWithData,
  updateUserRole
};