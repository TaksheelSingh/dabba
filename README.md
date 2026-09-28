# 🍱 Dabba. — Tiffin & Expense Tracker v2.0

> **Automated meal tracking, credit balance computation, and cycle ledger management. Built so you never pay for a meal you skipped.**

Designed & Built by **Taksheel Rawat**  
Hot Tiffins Delivered by **Kamlesh Negi**  

---

## 🏗️ Architecture & Engineering Highlights

- **Decoupled Business Logic:** Clean separation of concerns with Express routing in `server.js`, financial computations & cycle enrichment in `services/cycleService.js`, and database abstractions in `db.js`.
- **Multi-View Workspace Architecture:** Instant switching between **Dashboard** and **Payments Ledger** workspace views with 4 top KPI summary cards (`Total Logs`, `Initial Payments`, `Total Top-Ups`, `Money Loaded`) and a 6-column transaction ledger (`S.No`, `Cycle`, `Payment Date`, `Initial Payment`, `Add-Ons / Top-Ups`, `Total Paid`).
- **Zero-Flicker Architectural Color System:** High-end **Obsidian Velvet** (`#0B0E14`) Dark Mode and warm **Studio Porcelain** (`#F3F4F7`) Light Mode with instant zero-flicker theme switching via `.theme-transitioning` CSS class. Red Non-Veg meal badges styled in warm Crimson Rose (`#F43F5E` / `#E11D48`).
- **Responsive Mobile Calendar Engine:** `.calendar-grid` uses `repeat(7, minmax(0, 1fr))` grid tracks and auto-scaling aspect-ratio day tiles (`max-width: 40px` on mobile), ensuring all 7 weekday columns (`SUN` to `SAT`) fit 100% cleanly on any phone screen without horizontal overflow.
- **3-State Attendance Toggling:**
  - **Gray (Un-eaten / Skipped):** Default state for non-logged calendar dates.
  - **Green (Eaten):** Standard meal logged at the cycle's daily rate (e.g. ₹90/day).
  - **Red / Crimson (Non-Veg Meal):** Custom meal logged with special expense (e.g. ₹300 for chicken plate). Deducts exact custom amount from cash balance while updating eaten (+1) and skipped (-1) meal counters.
- **Verified Top-Up Payment Engine:** Automatically selects and binds the active cycle context on modal open. Recalculates daily rates (`Total Paid / 30`) and updates remaining balances, covered days, and transaction history in real time.
- **Single-Cycle Deletion & Reset System:** Compact user profile badge with an optically centered circular red **R** action button. Triggers cycle deletion (`DELETE /api/cycles/:id`) or complete cloud database wipes.
- **Equal-Height 8 KPI Grid Alignment:** 2x4 KPI mini-card grid spanning the exact vertical height of neighboring desktop cards, flush with bottom alignment and stadium rounded shapes (`border-radius: 9999px`).
- **Frozen Overview Calendar:** In *All Cycles* overview mode, calendar grid and month navigation lock cleanly with a centered overlay guiding cycle selection.
- **Mobile Responsive Layout:** Single-column vertical stacking on mobile screens ($\le 768\text{px}$) with custom modal overlays and touch-friendly controls.

---

## 🛠️ API Specification

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/cycles` | `GET` | Fetches all cycles enriched with total paid, consumed expense, remaining balance, and covered days. |
| `/api/cycles` | `POST` | Creates a new 30-day cycle with auto-incremented cycle number and optional initial payment. |
| `/api/cycles/:id` | `DELETE` | Deletes a specific cycle along with all its associated attendance meals and payment records. |
| `/api/payments` | `POST` | Adds a top-up payment to a cycle, live-recalculating total paid and per-meal daily rate. |
| `/api/meals` | `GET` | Retrieves meal attendance records. |
| `/api/meals/toggle` | `POST` | Toggles meal status (`eaten`, `special`, or `none`) with custom rate snapshot support. |
| `/api/telemetry` | `GET` | Returns lifetime telemetry metrics (total paid, total expense, effective cost per meal). |
| `/api/reset-now` | `GET` / `POST` | Hard clears all database records across cycles, payments, and meals. |

---

## 💻 Local Setup & Development

```bash
# 1. Clone the repository
git clone https://github.com/TaksheelSingh/dabba.git
cd dabba

# 2. Install dependencies
npm install

# 3. Start local development server
npm start
```

Access the dashboard locally at `http://localhost:3000`.

---

## 🚀 Live Public Deployment

- **GitHub Repository:** [https://github.com/TaksheelSingh/dabba](https://github.com/TaksheelSingh/dabba)
- **Live Render URL (24/7):** [https://dabba-yvl1.onrender.com](https://dabba-yvl1.onrender.com)

---

## 📄 License
ISC © 2026 **Taksheel Rawat**
