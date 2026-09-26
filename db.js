const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'dabba.db');

// Ensure parent directory exists for persistent disk mounts
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Cycles Table
  db.run(`
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

  // Payments Table (Split payments per cycle)
  db.run(`
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

  // Meals Table (3-state attendance with rate snapshotting)
  db.run(`
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

  // Clean up any legacy 'skipped' or 'none' records from meals table
  db.run(`DELETE FROM meals WHERE status = 'skipped' OR status = 'none'`);

  // Auto-seed Cycle #1 if database is brand new or empty, leaving meals 100% clean
  db.get(`SELECT COUNT(*) as count FROM cycles`, (err, row) => {
    if (!err && row && row.count === 0) {
      db.run(
        `INSERT INTO cycles (cycle_number, start_date, end_date, daily_rate, cycle_mode, status, notes)
         VALUES (1, '2026-09-01', '2026-09-30', 90.00, 'hybrid', 'active', 'Initial September Cycle')`,
        function (err2) {
          if (!err2) {
            const cycleId = this.lastID;
            db.run(
              `INSERT INTO payments (cycle_id, amount, paid_on, note)
               VALUES (?, 2700.00, '2026-09-01', 'Initial Cycle Payment')`,
              [cycleId]
            );
          }
        }
      );
    }
  });
});

// Helper utilities wrapped in Promises for clean async/await
const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

module.exports = { db, dbQuery, dbGet, dbRun };
