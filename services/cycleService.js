const { dbQuery, dbGet, dbRun } = require('../db');

/**
 * Utility: Adds N days to an ISO date string (YYYY-MM-DD)
 */
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Enriches a cycle object with payments, meals, expense calculations, and telemetry
 */
async function enrichCycle(cycle) {
  const payments = await dbQuery(`SELECT * FROM payments WHERE cycle_id = ? ORDER BY paid_on ASC`, [cycle.id]);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  // Recalculate daily rate if payments exist
  let dailyRate = cycle.daily_rate;
  if (totalPaid > 0) {
    const recalculatedRate = Math.round((totalPaid / 30) * 100) / 100;
    if (recalculatedRate !== cycle.daily_rate) {
      await dbRun(`UPDATE cycles SET daily_rate = ? WHERE id = ?`, [recalculatedRate, cycle.id]);
      dailyRate = recalculatedRate;
    }
  }

  const nextCycle = await dbGet(`SELECT start_date FROM cycles WHERE start_date > ? ORDER BY start_date ASC LIMIT 1`, [cycle.start_date]);
  const maxDate = nextCycle ? nextCycle.start_date : '9999-12-31';

  const meals = await dbQuery(
    `SELECT * FROM meals WHERE (cycle_id = ?) OR (date >= ? AND date < ? AND cycle_id IS NULL)`,
    [cycle.id, cycle.start_date, maxDate]
  );

  // Both normal 'eaten' and custom 'special' count as eaten meals
  const eatenMeals = meals.filter(m => m.status === 'eaten' || m.status === 'special');
  const eatenCount = eatenMeals.length;
  const skippedCount = Math.max(0, 30 - eatenCount);

  const totalExpense = eatenMeals.reduce((sum, m) => sum + (m.rate_snapshot !== undefined ? m.rate_snapshot : dailyRate), 0);
  const remainingBalance = totalPaid - totalExpense;
  const daysCovered = dailyRate > 0 ? Math.max(0, Math.floor(remainingBalance / dailyRate)) : 0;

  const initialPaid = payments.length > 0 ? payments[0].amount : cycle.daily_rate * 30;
  const topUpPaid = payments.length > 1 ? payments.slice(1).reduce((sum, p) => sum + p.amount, 0) : 0;

  return {
    ...cycle,
    daily_rate: dailyRate,
    payments,
    total_paid: totalPaid,
    initial_paid: initialPaid,
    topup_paid: topUpPaid,
    eaten_count: eatenCount,
    skipped_count: skippedCount,
    total_expense: totalExpense,
    remaining_balance: remainingBalance,
    days_covered: daysCovered
  };
}

/**
 * Recalculates total paid and daily rate for a cycle after payment changes
 */
async function syncCyclePaymentStats(cycleId) {
  const payments = await dbQuery(`SELECT amount FROM payments WHERE cycle_id = ?`, [cycleId]);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const newDailyRate = totalPaid > 0 ? Math.round((totalPaid / 30) * 100) / 100 : 90.00;

  await dbRun(`UPDATE cycles SET daily_rate = ? WHERE id = ?`, [newDailyRate, cycleId]);
  return { totalPaid, newDailyRate };
}

module.exports = {
  addDays,
  enrichCycle,
  syncCyclePaymentStats
};
