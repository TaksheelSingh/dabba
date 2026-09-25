# 🍱 Dabba. — Tiffin & Expense Tracker

> **Automated meal tracking, credit balance computation, and cycle ledger management. Built so you never pay for a meal you skipped.**

Designed & Built by **Taksheel Rawat**  
Hot Tiffins Delivered by **Kamlesh Negi**  

---

## 🌟 Key Features

- **3-Column Uniform Dashboard:** Attendance Calendar, Real-Time KPI Cards, and Active Cycle Ledger breakdown with edge-to-edge alignment.
- **3-State Attendance Toggling:**
  - **Gray (Un-eaten / Skipped):** Default state for non-logged days.
  - **Green (Eaten):** Logged standard meal at normal daily rate (e.g. ₹90/day).
  - **Yellow (Special Meal):** Logged meal with custom expense (e.g. ₹300 for special chicken plate). Automatically deducts custom amount from cash balance while keeping meal count incremented and skipped count decremented accurately.
- **Top-Up Payment Integration:** Instantly add top-up payments (+₹300) to live-recalculate daily rate (`Total Paid / 30`) and update remaining balance and covered days in real time.
- **Frozen Overview Calendar:** In *All Cycles (Lifetime)* mode, calendar grid locks with a clean warning banner overlay instructing selection of a valid cycle.
- **Persistent SQLite Ledger:** Powered by Express & SQLite database (`dabba.db`).

---

## 🚀 Quick Start (Local Setup)

```bash
# 1. Clone the repository
git clone https://github.com/TaksheelSingh/dabba.git
cd dabba

# 2. Install dependencies
npm install

# 3. Start local server
npm start
```

Open `http://localhost:3000` in your browser!
