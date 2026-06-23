const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { run, get, all, batch } = require('../db/sqlite');

function mapExpense(row) {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    date: row.date,
    category: row.category,
    isRecurring: Boolean(row.is_recurring),
    recurringDay: row.recurring_day ?? null,
    endDate: row.end_date ?? null
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
    endDate: row.end_date ?? null,
    recurringDay: row.recurring_day ?? null,
    status: row.status ?? 'active',
    closedAt: row.closed_at ?? null,
    closedProceeds: row.closed_proceeds == null ? null : Number(row.closed_proceeds),
    licPolicyNum: row.lic_policy_num ?? null,
    licSumAssured: row.lic_sum_assured == null ? null : Number(row.lic_sum_assured),
    licPremiumFreq: row.lic_premium_freq ?? null,
    licPremiumDue: row.lic_premium_due ?? null
  };
}

function mapLend(row) {
  return {
    id: row.id,
    person: row.person,
    amount: Number(row.amount),
    date: row.date,
    dueDate: row.due_date ?? null,
    note: row.note ?? null,
    returned: Boolean(row.returned),
    returnedAmount: Number(row.returned_amount) || 0
  };
}

function mapBorrow(row) {
  return {
    id: row.id,
    person: row.person,
    amount: Number(row.amount),
    date: row.date,
    dueDate: row.due_date ?? null,
    note: row.note ?? null,
    repaid: Boolean(row.repaid),
    repaidAmount: Number(row.repaid_amount) || 0
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

async function getIncomeByUserId(userId) {
  const rows = await all('SELECT * FROM income WHERE user_id = ?', [userId]);
  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    date: row.date,
    category: row.category,
    isRecurring: Boolean(row.is_recurring),
    recurringDay: row.recurring_day ?? null
  }));
}

async function getLendsByUserId(userId) {
  const rows = await all('SELECT * FROM lends WHERE user_id = ?', [userId]);
  return rows.map(mapLend);
}

async function getBorrowsByUserId(userId) {
  const rows = await all('SELECT * FROM borrows WHERE user_id = ?', [userId]);
  return rows.map(mapBorrow);
}

async function buildUserPayload(userRow) {
  const cashAmt = userRow.cash_balance_amount;
  const cashBalance = (cashAmt != null && Number(cashAmt) > 0)
    ? { amount: Number(cashAmt), note: userRow.cash_balance_note ?? null, updatedAt: userRow.cash_balance_updated_at ?? null }
    : null;

  return {
    username: userRow.username,
    role: userRow.role,
    income: await getIncomeByUserId(userRow.id),
    expenses: await getExpensesByUserId(userRow.id),
    investments: await getInvestmentsByUserId(userRow.id),
    lends: await getLendsByUserId(userRow.id),
    borrows: await getBorrowsByUserId(userRow.id),
    cashBalance
  };
}

async function createUser(username, password) {
  const hashed = await bcrypt.hash(password, 12);
  await run(
    'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)',
    [username, hashed, 'user', new Date().toISOString()]
  );
  return getUserByUsername(username);
}

async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

async function createSession(userId) {
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await run(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [token, userId, now.toISOString(), expiresAt]
  );
  return token;
}

async function deleteSession(token) {
  await run('DELETE FROM sessions WHERE token = ?', [token]);
}

async function getSessionUser(token) {
  const session = await get('SELECT * FROM sessions WHERE token = ?', [token]);
  if (!session) return null;

  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    await run('DELETE FROM sessions WHERE token = ?', [token]);
    return null;
  }

  return getUserById(session.user_id);
}

async function replaceUserData(userId, expenses, income, investments, lends = [], cashBalance = null, borrows = []) {
  const statements = [
    { sql: 'DELETE FROM expenses WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM income WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM investments WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM lends WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM borrows WHERE user_id = ?', args: [userId] }
  ];

  if (cashBalance != null) {
    statements.push({
      sql: 'UPDATE users SET cash_balance_amount = ?, cash_balance_note = ?, cash_balance_updated_at = ? WHERE id = ?',
      args: [Number(cashBalance.amount) || 0, cashBalance.note ?? null, cashBalance.updatedAt ?? null, userId]
    });
  }

  for (const inc of income) {
    statements.push({
      sql: `INSERT INTO income (id, user_id, description, amount, date, category, is_recurring, recurring_day)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [inc.id, userId, inc.description, Number(inc.amount), inc.date, inc.category, inc.isRecurring ? 1 : 0, inc.recurringDay ?? null]
    });
  }

  for (const expense of expenses) {
    statements.push({
      sql: `INSERT INTO expenses (id, user_id, description, amount, date, category, is_recurring, recurring_day, end_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [expense.id, userId, expense.description, Number(expense.amount), expense.date, expense.category, expense.isRecurring ? 1 : 0, expense.recurringDay ?? null, expense.endDate ?? null]
    });
  }

  for (const investment of investments) {
    statements.push({
      sql: `INSERT INTO investments (
              id, user_id, name, type, start_date, amount, rate, compounding, duration,
              end_date, recurring_day, status, closed_at, closed_proceeds,
              lic_policy_num, lic_sum_assured, lic_premium_freq, lic_premium_due
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        investment.id, userId, investment.name, investment.type, investment.startDate,
        Number(investment.amount), Number(investment.rate), String(investment.compounding ?? '12'),
        Number(investment.duration ?? 10),
        investment.endDate ?? null, investment.recurringDay ?? null,
        investment.status ?? 'active', investment.closedAt ?? null,
        investment.closedProceeds == null ? null : Number(investment.closedProceeds),
        investment.licPolicyNum ?? null,
        investment.licSumAssured == null ? null : Number(investment.licSumAssured),
        investment.licPremiumFreq ?? null, investment.licPremiumDue ?? null
      ]
    });
  }

  for (const lend of lends) {
    statements.push({
      sql: `INSERT INTO lends (id, user_id, person, amount, date, due_date, note, returned, returned_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        lend.id, userId, lend.person, Number(lend.amount), lend.date,
        lend.dueDate ?? null, lend.note ?? null,
        lend.returned ? 1 : 0, Number(lend.returnedAmount) || 0
      ]
    });
  }

  for (const borrow of borrows) {
    statements.push({
      sql: `INSERT INTO borrows (id, user_id, person, amount, date, due_date, note, repaid, repaid_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        borrow.id, userId, borrow.person, Number(borrow.amount), borrow.date,
        borrow.dueDate ?? null, borrow.note ?? null,
        borrow.repaid ? 1 : 0, Number(borrow.repaidAmount) || 0
      ]
    });
  }

  await batch(statements);
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
  verifyPassword,
  createSession,
  deleteSession,
  getSessionUser,
  replaceUserData,
  getAllUsersWithData,
  updateUserRole,
  getLendsByUserId,
  getBorrowsByUserId
};