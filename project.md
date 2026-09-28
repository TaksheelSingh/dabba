# 🍱 Dabba. — Tiffin & Expense Tracker (Project Specification v2.0)

## 1. Brand Identity & Design System
- **Name:** Dabba.
- **Aesthetic:** High-contrast, architectural minimalist (Geist / Inter typography, Obsidian Velvet `#0B0E14` dark mode & Studio Porcelain `#F3F4F7` light mode).
- **Colors:**
  - Emerald / Matcha (`#10B981` / `#34D399`) — Eaten Meal (Green Tile)
  - Crimson Rose (`#F43F5E` / `#E11D48`) — Non-Veg Meal (Red Tile) & Reset Action
  - Azure Cyan (`#38BDF8`) — Prepaid Covered Days
  - Indigo Violet (`#818CF8`) — Cycle Count Metrics
  - Amber (`#F59E0B`) — Expense & Top-Up Highlights
  - Elevated Obsidian (`#1A202C`) — Neutral Tile (Gray / Un-eaten)
- **Footer (Dashboard Exclusive):**
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
3. **Red / Crimson (`special`):** Logged Non-Veg meal with custom expense (e.g. ₹300 for special chicken plate). Deducts exact custom amount from cash balance while keeping eaten count (+1) and skipped count (-1) updated.

### B. Verified Top-Up Payment Engine
- **Split Payments & Top-Ups:** `payments` table linked to `cycle_id`.
- **Automatic Active Cycle Selection:** Opening the `Top Up Payment` modal automatically selects and binds the current active cycle context.
- **Live Daily Rate Recalculation:** Adding top-up payments live-recalculates `daily_rate = Total Paid / 30`.
- **Dynamic Ledger Sync:** Remaining balance (`Total Paid - Consumed Expense`) and covered days update in real time across Dashboard and Payments Workspace views.

### C. Workspace View Switching & Navigation
- **Multi-View Architecture:** Instant switching between `Dashboard` view and `Payments Ledger` workspace view.
- **Payments Workspace View:** Features 4 KPI cards (`Total Logs`, `Initial Payments`, `Total Top-Ups`, `Money Loaded`) and a full-width scrollable ledger table with 6 clean columns (`S.No`, `Cycle`, `Payment Date`, `Initial Payment`, `Add-Ons / Top-Ups`, `Total Paid`).

### D. Single-Cycle Deletion & Reset System
- **Compact Profile & Reset "R" Button:** Sidebar footer features a crammed profile badge (`Taksheel Rawat`) and an optically centered red circular **R** reset action button.
- **Cycle Deletion Modal:** Triggers `#modal-reset-options`, allowing users to delete a specific cycle (`DELETE /api/cycles/:id`) and purge all associated meals and payments, or perform a complete cloud database reset (`/api/reset-now`).

### E. Overview vs. Selected Cycle Calendar Locking
- **All Cycles:** Calendar grid and month navigation lock with blurred backdrop (`opacity: 0.25`, `filter: blur(1.5px)`), disabling clicks and showing a warning banner.
- **Selected Cycle (`Cycle #N`):** Grid unfreezes for single-tap toggling within cycle start and end date boundaries.

### F. Mobile Responsiveness & Equidistant Card Layout
- **Vertical Single-Column Stacking:** On mobile screens ($\le 768\text{px}$), the 3-column desktop grid dynamically transforms into a single full-width column.
- **Equidistant Spacing:** All dashboard cards maintain uniform vertical gaps.
- **Mobile Navigation Header:** Top bar includes a dedicated `+ New Cycle` button for quick mobile cycle creation.

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

## 4. API Endpoints Reference

```
GET    /api/cycles        - Get enriched cycle list
POST   /api/cycles        - Create new 30-day cycle
DELETE /api/cycles/:id    - Delete specific cycle & associated records
POST   /api/payments      - Add top-up payment & sync stats
GET    /api/meals         - Get meal attendance records
POST   /api/meals/toggle  - Toggle meal status (eaten, special, none)
GET    /api/telemetry      - Get lifetime financial telemetry
GET    /api/reset-now     - Hard wipe database
```

---

## 5. Security & Environment Compliance
- **No Secret Files Pushed:** Zero `.env` files, API keys, or private tokens committed to GitHub.
- **Git Ignore:** Configured to exclude `node_modules/`, `.gemini/`, `.env`, and log files.
