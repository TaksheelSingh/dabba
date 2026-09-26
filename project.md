# 🍱 Dabba. — Tiffin & Expense Tracker (Project Specification v2.0)

## 1. Brand Identity & Design System
- **Name:** Dabba.
- **Aesthetic:** High-contrast, tactile minimalist (Geist / Inter typography, dark basalt `#0C1020` & light basalt `#F8FAFC`).
- **Colors:**
  - Emerald / Matcha (`#10B981` / `#34D399`) — Eaten Meal (Green Tile)
  - Amber (`#F59E0B`) — Special Meal (Yellow Tile)
  - Rose / Red (`#EF4444`) — Warning & Alerts
  - Elevated Basalt (`#1B2238`) — Neutral Tile (Gray / Un-eaten)
- **Footer:**
  ```
  © 2026 Dabba. All tiffins accounted for. Zero cold tiffins, zero math headaches.
  Made by Taksheel Rawat
  Food delivered by Kamlesh Negi
  ```

---

## 2. Advanced Real-World Logic Engine (v2.0)

### A. 3-State Meal Attendance System
1. **Gray (`none` / Un-eaten):** Default state for non-logged calendar dates in a cycle.
2. **Green (`eaten`):** Logged standard meal deducted at standard daily rate (`daily_rate` e.g. ₹90).
3. **Yellow (`special`):** Logged meal with custom expense (e.g. ₹300 for special chicken plate). Deducts exact custom amount from cash balance while keeping eaten count (+1) and skipped count (-1) updated.

### B. Top-Up Payment Engine
- **Split Payments & Top-Ups:** `payments` table linked to `cycle_id`.
- **Live Daily Rate Recalculation:** Adding top-up payments live-recalculates `daily_rate = Total Paid / 30`.
- **Dynamic Ledger Sync:** Remaining balance (`Total Paid - Consumed Expense`) and covered days (`Math.floor(Remaining Balance / Daily Rate)`) update in real time.

### C. Overview vs. Selected Cycle Calendar Locking
- **All Cycles (Lifetime):** Calendar grid and month navigation lock with blurred backdrop (`opacity: 0.25`, `filter: blur(1.5px)`), disabling clicks and showing a red warning banner.
- **Selected Cycle (`Cycle #N`):** Grid unfreezes for single-tap toggling within cycle start and end date boundaries.

### D. Mobile Responsiveness & Equidistant Card Layout
- **Vertical Single-Column Stacking:** On mobile screens ($\le 768\text{px}$), the 3-column desktop grid dynamically transforms into a single full-width column (`flex-direction: column !important; width: 100% !important;`).
- **Equidistant Mobile Spacing:** All dashboard cards maintain a uniform 14px vertical gap across calendar, KPI metrics, and payment ledger sections.
- **Mobile Navigation Header:** Top bar includes a dedicated `+ New Cycle` white button for quick mobile cycle creation.

### E. Silent Notifications & Zero-Flicker UX
- **Native Alert Removal:** Replaced legacy `alert(...)` popups with silent visual UI updates.
- **Zero-Flicker Mobile Theme Switching:** Optimized CSS selectors by stripping universal wildcard `*` transitions, ensuring smooth, instantaneous light/dark theme toggles on mobile GPUs.

---

## 3. Schema Specifications (`dabba.db`)

```sql
CREATE TABLE cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    start_date TEXT NOT NULL,         -- YYYY-MM-DD
    end_date TEXT NOT NULL,           -- YYYY-MM-DD (start_date + 29 days)
    daily_rate REAL NOT NULL,
    cycle_mode TEXT DEFAULT 'hybrid', -- 'hybrid'
    status TEXT DEFAULT 'active',     -- 'active' | 'concluded'
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_id INTEGER REFERENCES cycles(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    paid_on TEXT NOT NULL,            -- YYYY-MM-DD
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,        -- YYYY-MM-DD
    status TEXT NOT NULL,             -- 'eaten' | 'special'
    rate_snapshot REAL NOT NULL,
    cycle_id INTEGER REFERENCES cycles(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Security & Environment Compliance
- **No Secret Files Pushed:** Zero `.env` files, API keys, or private tokens committed to GitHub.
- **Git Ignore:** Configured to exclude `node_modules/`, `.gemini/`, `.env`, and log files.
