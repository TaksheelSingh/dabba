const express = require('express');
const path = require('path');
const os = require('os');
const { dbQuery, dbGet, dbRun } = require('./db');
const { addDays, enrichCycle, syncCyclePaymentStats } = require('./services/cycleService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// -------------------------------------------------------------
// CYCLES API
// -------------------------------------------------------------
app.get('/api/cycles', async (req, res) => {
  try {
    let cycles = await dbQuery(`SELECT * FROM cycles ORDER BY start_date DESC`);
    
    // Auto-ensure Cycle #1 exists if database is clean/empty
    if (cycles.length === 0) {
      const resCycle = await dbRun(
        `INSERT INTO cycles (cycle_number, start_date, end_date, daily_rate, cycle_mode, status, notes)
         VALUES (1, '2026-09-01', '2026-09-30', 90.00, 'hybrid', 'active', 'Initial September Cycle')`
      );
      await dbRun(
        `INSERT INTO payments (cycle_id, amount, paid_on, note) VALUES (?, 2700.00, '2026-09-01', 'Initial Cycle Payment')`,
        [resCycle.id]
      );
      cycles = await dbQuery(`SELECT * FROM cycles ORDER BY start_date DESC`);
    }

    const enriched = await Promise.all(cycles.map(enrichCycle));
    res.json({ success: true, cycles: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/cycles', async (req, res) => {
  try {
    const { start_date, daily_rate, paid_amount, paid_on, cycle_mode, notes } = req.body;

    if (!start_date || !daily_rate) {
      return res.status(400).json({ success: false, error: 'Start date and daily rate are required' });
    }

    const end_date = addDays(start_date, 29);
    const countRow = await dbGet(`SELECT COUNT(*) as cnt FROM cycles`);
    const cycle_number = (countRow ? countRow.cnt : 0) + 1;

    const result = await dbRun(
      `INSERT INTO cycles (cycle_number, start_date, end_date, daily_rate, cycle_mode, status, notes)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [cycle_number, start_date, end_date, parseFloat(daily_rate), cycle_mode || 'hybrid', notes || '']
    );

    const cycleId = result.id;

    if (paid_amount && parseFloat(paid_amount) > 0) {
      await dbRun(
        `INSERT INTO payments (cycle_id, amount, paid_on, note) VALUES (?, ?, ?, ?)`,
        [cycleId, parseFloat(paid_amount), paid_on || start_date, 'Initial Cycle Payment']
      );
    }

    res.json({ success: true, cycle_id: cycleId, cycle_number, end_date });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// PAYMENTS API (Top-Up Payments)
// -------------------------------------------------------------
app.post('/api/payments', async (req, res) => {
  try {
    const { cycle_id, amount, paid_on, note } = req.body;
    if (!cycle_id || !amount || !paid_on) {
      return res.status(400).json({ success: false, error: 'cycle_id, amount, and paid_on are required' });
    }

    const result = await dbRun(
      `INSERT INTO payments (cycle_id, amount, paid_on, note) VALUES (?, ?, ?, ?)`,
      [cycle_id, parseFloat(amount), paid_on, note || 'Top Up Payment']
    );

    const { totalPaid, newDailyRate } = await syncCyclePaymentStats(cycle_id);

    res.json({ success: true, payment_id: result.id, total_paid: totalPaid, daily_rate: newDailyRate });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// MEALS API (3-State Toggle: Gray -> Green -> Yellow -> Gray)
// -------------------------------------------------------------
app.get('/api/meals', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `SELECT * FROM meals`;
    let params = [];

    if (start_date && end_date) {
      sql += ` WHERE date >= ? AND date <= ?`;
      params.push(start_date, end_date);
    }

    const meals = await dbQuery(sql, params);
    res.json({ success: true, meals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/meals/toggle', async (req, res) => {
  try {
    const { date, status, custom_rate } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, error: 'Date is required' });
    }

    if (!status || status === 'none') {
      await dbRun(`DELETE FROM meals WHERE date = ?`, [date]);
      return res.json({ success: true, date, status: 'none' });
    }

    const activeCycle = await dbGet(
      `SELECT * FROM cycles WHERE start_date <= ? AND end_date >= ? ORDER BY id DESC LIMIT 1`,
      [date, date]
    );

    const defaultRate = activeCycle ? activeCycle.daily_rate : 90.00;
    const cycleId = activeCycle ? activeCycle.id : null;

    let rateToUse = defaultRate;
    if (custom_rate !== undefined && custom_rate !== null && custom_rate !== '') {
      rateToUse = parseFloat(custom_rate);
    }

    const existing = await dbGet(`SELECT * FROM meals WHERE date = ?`, [date]);

    if (existing) {
      await dbRun(
        `UPDATE meals SET status = ?, rate_snapshot = ?, cycle_id = ? WHERE date = ?`,
        [status, rateToUse, cycleId || existing.cycle_id, date]
      );
    } else {
      await dbRun(
        `INSERT INTO meals (date, status, rate_snapshot, cycle_id) VALUES (?, ?, ?, ?)`,
        [date, status, rateToUse, cycleId]
      );
    }

    res.json({ success: true, date, status, rate: rateToUse });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// TELEMETRY & ANALYTICS API
// -------------------------------------------------------------
app.get('/api/telemetry', async (req, res) => {
  try {
    const allPayments = await dbQuery(`SELECT * FROM payments`);
    const allMeals = await dbQuery(`SELECT * FROM meals`);
    const allCycles = await dbQuery(`SELECT * FROM cycles ORDER BY start_date ASC`);

    const lifetimePaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const eatenMeals = allMeals.filter(m => m.status === 'eaten' || m.status === 'special');

    const lifetimeEatenCount = eatenMeals.length;
    const totalCycleDays = allCycles.length * 30;
    const lifetimeSkippedCount = Math.max(0, totalCycleDays - lifetimeEatenCount);
    const lifetimeExpense = eatenMeals.reduce((sum, m) => sum + m.rate_snapshot, 0);

    const effectiveCostPerMeal = lifetimeEatenCount > 0 
      ? (lifetimePaid / lifetimeEatenCount).toFixed(2) 
      : "0";

    res.json({
      success: true,
      telemetry: {
        lifetimePaid,
        lifetimeExpense,
        netBalance: lifetimePaid - lifetimeExpense,
        lifetimeEatenCount,
        lifetimeSkippedCount,
        effectiveCostPerMeal,
        activeCyclesCount: allCycles.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIPAddress();
  console.log(`\n==================================================`);
  console.log(`  🍱 Dabba. — Tiffin & Expense Tracker`);
  console.log(`==================================================`);
  console.log(`  Local PC Access:     http://localhost:${PORT}`);
  console.log(`  Mobile Phone Access:  http://${localIP}:${PORT}`);
  console.log(`==================================================\n`);
});
