#!/usr/bin/env node
// Run with: node scripts/reset-admin.js <new-password>
// Updates the admin account's password hash in the database.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');

const newPassword = process.argv[2];
if (!newPassword) {
  console.error('Usage: node scripts/reset-admin.js <new-password>');
  process.exit(1);
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${require('path').resolve(__dirname, '../data/aurelia.db')}`,
  authToken: process.env.TURSO_AUTH_TOKEN
});

(async () => {
  const hashed = await bcrypt.hash(newPassword, 12);
  const result = await client.execute({
    sql: "UPDATE users SET password = ? WHERE username = 'admin'",
    args: [hashed]
  });
  if (result.rowsAffected === 0) {
    console.error('Admin user not found.');
    process.exit(1);
  }
  console.log('Admin password updated successfully.');
})();
