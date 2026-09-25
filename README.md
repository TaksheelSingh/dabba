# 🍱 Dabba. — Tiffin & Expense Tracker v2.0

> **Automated meal tracking, credit balance computation, and cycle ledger management. Built so you never pay for a meal you skipped.**

Designed & Built by **Taksheel Rawat**  
Hot Tiffins Delivered by **Kamlesh Negi**  

---

## 🏗️ Architecture & Engineering Highlights

- **Decoupled Business Logic:** Clean separation of concerns with Express routing in `server.js`, financial computations & cycle enrichment in `services/cycleService.js`, and database abstractions in `db.js`.
- **DRY (Don't Repeat Yourself) Principles:** Zero code duplication. Unified parallel data fetching (`refreshAppState()`) and consolidated state management.
- **3-State Attendance Toggling:**
  - **Gray (Un-eaten / Skipped):** Default state for non-logged calendar dates.
  - **Green (Eaten):** Standard meal logged at the cycle's daily rate (e.g. ₹90/day).
  - **Yellow (Special Meal):** Custom meal logged with special expense (e.g. ₹300 for chicken plate). Deducts exact custom amount from cash balance while correctly updating eaten (+1) and skipped (-1) meal counters.
- **Top-Up Payment Integration:** Add extra payments (+₹300) anytime to live-recalculate daily rates (`Total Paid / 30`) and update remaining balances and covered days instantly.
- **Frozen Overview Calendar:** In *All Cycles (Lifetime)* mode, calendar grid and month navigation lock cleanly with a warning overlay guiding cycle selection.
- **Symmetric 3-Column Layout:** Pixel-perfect layout symmetry across Attendance Calendar, Real-Time KPI Cards, and Active Cycle Ledger Summary.

---

## 🛠️ API Specification

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/cycles` | `GET` | Fetches all cycles enriched with total paid, consumed expense, remaining balance, and covered days. |
| `/api/cycles` | `POST` | Creates a new 30-day cycle with auto-incremented cycle number and optional initial payment. |
| `/api/payments` | `POST` | Adds a top-up payment to a cycle, live-recalculating total paid and per-meal daily rate. |
| `/api/meals` | `GET` | Retrieves meal attendance records. |
| `/api/meals/toggle` | `POST` | Toggles meal status (`eaten`, `special`, or `none`) with custom rate snapshot support. |
| `/api/telemetry` | `GET` | Returns lifetime telemetry metrics (total paid, total expense, effective cost per meal). |

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
- **Live Public URL:** [https://dabba-tiffin.loca.lt](https://dabba-tiffin.loca.lt)

---

## 📄 License
ISC © 2026 **Taksheel Rawat**
