# Dabba. — Local Tiffin & Expense Tracker

## 1. Brand Identity & Design System
- **Name:** Dabba.
- **Aesthetic:** High-contrast, tactile minimalist (Linear / Teenage Engineering inspired).
- **Colors:** Deep Basalt (`#0D0E11`), Matte Charcoal (`#16181D`), Emerald/Matcha (`#22C55E` / `#34D399`), Sage Range Highlight (`rgba(52, 211, 153, 0.12)`), Hatch/Dashed pattern for Vendor Off.
- **Mobile UX:** One-Tap "Mark Today" Quick Banner, Haptic Feedback (`navigator.vibrate`), PWA / Add to Home Screen support.

---

## 2. Advanced Real-World Logic Engine

### A. 3-State Meal Attendance System
1. `Eaten` — Green circular badge (deducts 1 meal credit @ `rate_snapshot`).
2. `Skipped by Me` — Neutral stone badge (user chose not to eat).
3. `Vendor Off / No Service` — Hatch/dashed circle (Sunday / vendor holiday, excluded from personal skip stats).

### B. Dual Cycle Modes (Quota vs. Fixed Expiry)
- **Meal Quota Mode (Flexible):** Unused credits carry forward indefinitely until consumed.
- **Fixed Expiry Mode (Use-It-Or-Lose-It):** 30 calendar days limit; unconsumed meals marked as forfeited value at cycle end.

### C. Split Payments & Price Volatility
- **One-to-Many Payments:** `payments` table linked to `cycle_id` allowing top-ups & split payments.
- **Meal-Level Price Snapshotting:** Every meal record stores `rate_snapshot` protecting historical ledgers against price hikes.

### D. Overdraft & Debt Management
- Negative balance allowed (`-₹180` Debt state) with prominent visual alerts when payments are due.

---

## 3. Telemetry, Analytics & Financial Metrics

### A. Financial Leakage & Efficiency
- **Effective Cost Per Meal:** `Total Amount Paid / Total Meals Consumed`.
- **Money Wasted / Forfeited:** Value of expired unconsumed meals in fixed-expiry cycles.
- **Daily Burn Rate:** Average daily expenditure rate.

### B. Habit & Attendance Analytics
- **Consistency Streak:** Current consecutive days of eating tiffin.
- **Skip Rate Percentage:** `(Skipped Days / Total Delivery Days) * 100`.
- **Day-of-Week Drop-off Pattern:** Breakdown of skip frequency by weekday (e.g. 70% Friday drop-off).
- **Projected Depletion Date:** Estimated date current balance will run dry based on eating pace.

---

## 4. Schema Specifications (`dabba.db`)

```sql
CREATE TABLE cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    start_date TEXT NOT NULL,         -- YYYY-MM-DD
    end_date TEXT NOT NULL,           -- YYYY-MM-DD (start_date + 29 days)
    daily_rate REAL NOT NULL,
    cycle_mode TEXT DEFAULT 'hybrid', -- 'quota' | 'fixed_expiry' | 'hybrid'
    status TEXT DEFAULT 'active',     -- 'active' | 'concluded' | 'overdue'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_id INTEGER REFERENCES cycles(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    paid_on TEXT NOT NULL,            -- YYYY-MM-DD
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,        -- YYYY-MM-DD (2026-01-01 to 2036-12-31)
    status TEXT NOT NULL,             -- 'eaten' | 'skipped' | 'vendor_off'
    rate_snapshot REAL NOT NULL,
    cycle_id INTEGER REFERENCES cycles(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
