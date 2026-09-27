const { createClient } = require('@libsql/client');
const path = require('path');

const url = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'dabba.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url,
  authToken
});

async function initDB() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_number INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      daily_rate REAL NOT NULL,
      cycle_mode TEXT DEFAULT 'hybrid',
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      paid_on TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES cycles(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL,
      rate_snapshot REAL NOT NULL,
      cycle_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES cycles(id) ON DELETE SET NULL
    )
  `);

  await client.execute(`DELETE FROM meals WHERE status = 'skipped' OR status = 'none'`);
}

initDB().catch(err => console.error("Error initializing DB schema:", err));

const dbQuery = async (sql, params = []) => {
  const result = await client.execute({ sql, args: params });
  return result.rows.map(row => ({ ...row }));
};

const dbGet = async (sql, params = []) => {
  const result = await client.execute({ sql, args: params });
  return result.rows.length > 0 ? { ...result.rows[0] } : null;
};

const dbRun = async (sql, params = []) => {
  const result = await client.execute({ sql, args: params });
  const id = result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : null;
  return { id, changes: result.rowsAffected };
};

module.exports = { client, dbQuery, dbGet, dbRun };
