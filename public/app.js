// -------------------------------------------------------------
// DABBA. — Client App State & Engine
// Clean State Sync & Cycle-Specific Data Binding
// -------------------------------------------------------------

let state = {
  cycles: [],
  selectedCycleId: 'all',
  currentYear: 2026,
  currentMonth: 8,
  meals: {},
  telemetry: {},
  theme: localStorage.getItem('dabba_theme') || 'dark'
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);

  const today = new Date();
  state.currentYear = today.getFullYear();
  state.currentMonth = today.getMonth();

  const todayStr = getTodayISOString();
  const startInput = document.getElementById('input-cycle-start');
  const endInput = document.getElementById('input-cycle-end');
  
  if (startInput) startInput.value = todayStr;
  if (endInput) endInput.value = addDaysISO(todayStr, 29); // Auto 30-day window
  
  const paidOnInput = document.getElementById('input-cycle-paid-on');
  if (paidOnInput) paidOnInput.value = todayStr;

  const calendarCard = document.getElementById('calendar-card');
  if (calendarCard) {
    calendarCard.addEventListener('click', () => {
      if (state.selectedCycleId === 'all') {
        showToast("Please select a valid cycle from the dropdown to log meals");
      }
    });
  }

  renderCalendar();
  initData();
});

// Theme Switcher Engine (Sun / Moon)
function toggleTheme() {
  triggerHaptic();
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('dabba_theme', state.theme);
  applyTheme(state.theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = theme === 'dark' ? '☀️' : '🌙';
  const iconDesktop = document.getElementById('theme-icon-desktop');
  const iconMobile = document.getElementById('theme-icon-mobile');
  if (iconDesktop) iconDesktop.innerText = icon;
  if (iconMobile) iconMobile.innerText = icon;
}

function getTodayISOString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysISO(dateISO, days) {
  if (!dateISO) return '';
  const d = new Date(dateISO + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

let calcTimerStart = null;
let calcTimerPaid = null;
let calcTimerRate = null;

function onCycleStartChange() {
  const startVal = document.getElementById('input-cycle-start').value;
  const endInput = document.getElementById('input-cycle-end');
  const spinner = document.getElementById('end-date-spinner');
  const card = document.getElementById('modal-card-new-cycle');

  if (spinner) spinner.classList.remove('hidden');
  if (card) card.classList.add('calculating-freeze');

  clearTimeout(calcTimerStart);
  calcTimerStart = setTimeout(() => {
    if (startVal && endInput) {
      endInput.value = addDaysISO(startVal, 29); // 30 days inclusive
    }
    if (spinner) spinner.classList.add('hidden');
    if (card) card.classList.remove('calculating-freeze');
  }, 250);
}

function onCyclePaymentInput() {
  const paidVal = parseFloat(document.getElementById('input-cycle-paid').value) || 0;
  const rateInput = document.getElementById('input-cycle-rate');
  const spinner = document.getElementById('rate-spinner');
  const card = document.getElementById('modal-card-new-cycle');

  if (spinner) spinner.classList.remove('hidden');
  if (card) card.classList.add('calculating-freeze');

  clearTimeout(calcTimerPaid);
  calcTimerPaid = setTimeout(() => {
    if (rateInput) {
      rateInput.value = paidVal > 0 ? (paidVal / 30).toFixed(2) : '0';
    }
    if (spinner) spinner.classList.add('hidden');
    if (card) card.classList.remove('calculating-freeze');
  }, 250);
}

function onCycleRateInput() {
  const rateVal = parseFloat(document.getElementById('input-cycle-rate').value) || 0;
  const paidInput = document.getElementById('input-cycle-paid');
  const spinner = document.getElementById('paid-spinner');
  const card = document.getElementById('modal-card-new-cycle');

  if (spinner) spinner.classList.remove('hidden');
  if (card) card.classList.add('calculating-freeze');

  clearTimeout(calcTimerRate);
  calcTimerRate = setTimeout(() => {
    if (paidInput) {
      paidInput.value = rateVal > 0 ? Math.round(rateVal * 30) : '0';
    }
    if (spinner) spinner.classList.add('hidden');
    if (card) card.classList.remove('calculating-freeze');
  }, 250);
}

function formatDisplayDate(isoStr) {
  if (!isoStr) return '-';
  const dateObj = new Date(isoStr + 'T00:00:00Z');
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function formatShortDateYear(isoStr) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  const dateObj = new Date(isoStr + 'T00:00:00Z');
  const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const shortYear = y.slice(2);
  return `${monthStr} ${parseInt(d)}, ${shortYear}`;
}

function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(20);
  }
}

async function refreshAppState() {
  await Promise.all([fetchCycles(), fetchMeals(), fetchTelemetry()]);
  updateDashboardSymmetry();
  renderCalendar();
  renderPaymentsView();
}

async function initData() {
  await Promise.all([fetchCycles(), fetchMeals(), fetchTelemetry()]);

  // Restore saved cycle selection from localStorage across page refreshes
  const savedCycle = localStorage.getItem('dabba_selected_cycle');
  if (savedCycle && (savedCycle === 'all' || state.cycles.some(c => String(c.id) === String(savedCycle)))) {
    state.selectedCycleId = savedCycle;
  } else if (state.cycles.length > 0) {
    state.selectedCycleId = String(state.cycles[0].id);
    localStorage.setItem('dabba_selected_cycle', state.selectedCycleId);
  } else {
    state.selectedCycleId = 'all';
  }

  const select = document.getElementById('cycle-select');
  if (select) select.value = state.selectedCycleId;

  updateDashboardSymmetry();
  renderCalendar();
  renderPaymentsView();
}

// API Fetchers with clean state reset
async function fetchCycles() {
  try {
    const res = await fetch('/api/cycles?t=' + Date.now());
    const data = await res.json();
    if (data.success) {
      state.cycles = data.cycles;
      populateCycleDropdown();
    }
  } catch (err) {
    console.error("Error fetching cycles:", err);
  }
}

async function fetchMeals() {
  try {
    const res = await fetch('/api/meals?t=' + Date.now());
    const data = await res.json();
    if (data.success) {
      state.meals = {}; // Completely reset meals map
      data.meals.forEach(m => {
        state.meals[m.date] = m;
      });
    }
  } catch (err) {
    console.error("Error fetching meals:", err);
  }
}

async function fetchTelemetry() {
  try {
    const res = await fetch('/api/telemetry?t=' + Date.now());
    const data = await res.json();
    if (data.success) {
      state.telemetry = data.telemetry;
    }
  } catch (err) {
    console.error("Error fetching telemetry:", err);
  }
}

function populateCycleDropdown() {
  const select = document.getElementById('cycle-select');
  if (!select) return;
  
  select.innerHTML = '<option value="all">All Cycles</option>';

  const seenCycleNumbers = new Set();
  state.cycles.forEach((c) => {
    if (seenCycleNumbers.has(c.cycle_number)) return;
    seenCycleNumbers.add(c.cycle_number);

    const optionText = `Cycle ${c.cycle_number} - ${formatShortDateYear(c.start_date)} to ${formatShortDateYear(c.end_date)}`;
    
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.innerText = optionText;
    select.appendChild(opt);
  });

  select.value = state.selectedCycleId;
}

function onCycleChange() {
  state.selectedCycleId = document.getElementById('cycle-select').value;
  localStorage.setItem('dabba_selected_cycle', state.selectedCycleId);
  updateDashboardSymmetry();
  renderCalendar();
}

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast-msg');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// Dashboard Data Updater
function updateDashboardSymmetry() {
  const cycleNumEl = document.getElementById('kpi-cycle-num');
  const daysEatenEl = document.getElementById('kpi-days-eaten');
  const vegCntEl = document.getElementById('kpi-veg-cnt');
  const nonVegCntEl = document.getElementById('kpi-nonveg-cnt');
  const remainingMealsEl = document.getElementById('kpi-remaining-meals');
  const skippedCntEl = document.getElementById('kpi-skipped-cnt');

  const ledgerRate = document.getElementById('ledger-rate');
  const ledgerPaid = document.getElementById('ledger-paid');
  const ledgerExpense = document.getElementById('ledger-expense');
  const calendarCard = document.getElementById('calendar-card');
  const progressBarEl = document.getElementById('cycle-progress-bar');
  const progressPercentEl = document.getElementById('cycle-progress-percent');

  const allMealsList = Object.values(state.meals);
  const totalVegAll = allMealsList.filter(m => m.status === 'eaten').length;
  const totalNonVegAll = allMealsList.filter(m => m.status === 'special').length;
  const totalEatenAll = totalVegAll + totalNonVegAll;
  const totalLoadedAll = state.cycles.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  const lifetimeExpenseAll = state.telemetry.lifetimeExpense || 0;

  if (state.selectedCycleId === 'all') {
    // Lock calendar visual state in overview mode
    if (calendarCard) calendarCard.classList.add('locked');

    if (cycleNumEl) cycleNumEl.innerText = state.cycles.length > 0 ? `#${state.cycles[0].cycle_number}` : '#0';
    if (daysEatenEl) daysEatenEl.innerText = totalEatenAll;
    if (vegCntEl) vegCntEl.innerText = totalVegAll;
    if (nonVegCntEl) nonVegCntEl.innerText = totalNonVegAll;
    if (remainingMealsEl) remainingMealsEl.innerText = state.telemetry.lifetimeSkippedCount || 0;
    if (skippedCntEl) skippedCntEl.innerText = state.telemetry.lifetimeSkippedCount || 0;

    if (ledgerRate) ledgerRate.innerText = `Avg ₹0/day`;
    if (ledgerPaid) ledgerPaid.innerText = `₹${totalLoadedAll.toFixed(2)}`;
    if (ledgerExpense) ledgerExpense.innerText = `₹${lifetimeExpenseAll.toFixed(2)}`;

    const totalDays = state.cycles.length * 30;
    const progressPct = totalDays > 0 ? Math.min(100, Math.round((totalEatenAll / totalDays) * 100)) : 0;
    if (progressBarEl) progressBarEl.style.width = `${progressPct}%`;
    if (progressPercentEl) progressPercentEl.innerText = `${progressPct}% (${totalEatenAll}/${totalDays} Days)`;

  } else {
    // Unlock calendar visual state when cycle is selected
    if (calendarCard) calendarCard.classList.remove('locked');

    const cycle = state.cycles.find(c => String(c.id) === String(state.selectedCycleId));
    if (cycle) {
      const cycleMeals = allMealsList.filter(m => m.date >= cycle.start_date && m.date <= cycle.end_date);
      const vegCount = cycleMeals.filter(m => m.status === 'eaten').length;
      const nonVegCount = cycleMeals.filter(m => m.status === 'special').length;
      const totalLogged = vegCount + nonVegCount;
      const remainingMeals = Math.max(0, 30 - totalLogged);

      const progressPct = Math.min(100, Math.round((totalLogged / 30) * 100));
      if (progressBarEl) progressBarEl.style.width = `${progressPct}%`;
      if (progressPercentEl) progressPercentEl.innerText = `${progressPct}% (${totalLogged}/30 Days)`;

      if (cycleNumEl) cycleNumEl.innerText = `#${cycle.cycle_number}`;
      if (daysEatenEl) daysEatenEl.innerText = totalLogged;
      if (vegCntEl) vegCntEl.innerText = vegCount;
      if (nonVegCntEl) nonVegCntEl.innerText = nonVegCount;
      if (remainingMealsEl) remainingMealsEl.innerText = remainingMeals;
      if (skippedCntEl) skippedCntEl.innerText = cycle.skipped_count;

      if (ledgerRate) ledgerRate.innerText = `₹${cycle.daily_rate}/day`;
      if (ledgerPaid) ledgerPaid.innerText = `₹${cycle.total_paid.toFixed(2)}`;
      if (ledgerExpense) ledgerExpense.innerText = `₹${cycle.total_expense.toFixed(2)}`;
    }
  }
}

// Calendar Generator
function renderCalendar() {
  const monthYearLabel = document.getElementById('month-year-label');
  const grid = document.getElementById('calendar-grid');
  const calendarCard = document.getElementById('calendar-card');

  if (!grid || !monthYearLabel) return;

  // Toggle locked card state & banner
  if (calendarCard) {
    calendarCard.classList.toggle('locked', state.selectedCycleId === 'all');
  }

  // Remove previous day tiles cleanly while preserving weekday headers
  const tiles = grid.querySelectorAll('.day-tile');
  tiles.forEach(t => t.remove());

  // Guarantee integer values for currentMonth and currentYear
  state.currentMonth = parseInt(state.currentMonth, 10);
  state.currentYear = parseInt(state.currentYear, 10);

  monthYearLabel.innerText = `${MONTH_NAMES[state.currentMonth]} ${state.currentYear}`;

  const firstDayIndex = new Date(state.currentYear, state.currentMonth, 1).getDay();
  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  const todayStr = getTodayISOString();

  let activeCycle = null;
  if (state.selectedCycleId !== 'all') {
    activeCycle = state.cycles.find(c => String(c.id) === String(state.selectedCycleId));
  }

  for (let i = 0; i < firstDayIndex; i++) {
    const blank = document.createElement('div');
    blank.className = 'day-tile empty';
    grid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(state.currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${state.currentYear}-${monthStr}-${dayStr}`;

    const tile = document.createElement('div');
    tile.className = 'day-tile normal';
    tile.innerText = day;

    if (dateKey === todayStr) tile.classList.add('today');

    if (activeCycle) {
      if (dateKey >= activeCycle.start_date && dateKey <= activeCycle.end_date) {
        tile.classList.add('in-cycle-range');
        const meal = state.meals[dateKey];
        if (meal) {
          if (meal.status === 'eaten') {
            tile.classList.add('state-eaten');
            tile.title = `Veg Meal (Standard Rate: ₹${meal.rate_snapshot})`;
          } else if (meal.status === 'special') {
            tile.classList.add('state-special');
            tile.title = `Non-Veg Meal (Custom Expense: ₹${meal.rate_snapshot})`;
          }
        }
      }
    }

    tile.addEventListener('click', async (e) => {
      e.stopPropagation();
      triggerHaptic();
      if (state.selectedCycleId === 'all') {
        showToast("Please select a valid cycle from the dropdown to view or log daily meals");
        return;
      }
      if (activeCycle) {
        if (dateKey < activeCycle.start_date || dateKey > activeCycle.end_date) {
          showToast(`Date is outside Cycle #${activeCycle.cycle_number} (${formatShortDateYear(activeCycle.start_date)} - ${formatShortDateYear(activeCycle.end_date)})`);
          return;
        }
      }

      const currentMeal = state.meals[dateKey];
      const isLogged = currentMeal && (currentMeal.status === 'eaten' || currentMeal.status === 'special');

      if (!isLogged) {
        // Tap on Gray tile -> Green ('eaten')
        await postMealToggle(dateKey, 'eaten');
      } else {
        // Tap on Green or Yellow tile -> Open Meal Options Modal (Special / Unselect / Cancel)
        openSpecialMealModal(dateKey);
      }
    });

    grid.appendChild(tile);
  }
}

function changeMonth(delta) {
  if (state.selectedCycleId === 'all') {
    showToast("Please select a valid cycle from the dropdown to view or log daily meals");
    return;
  }
  triggerHaptic();
  state.currentMonth = parseInt(state.currentMonth, 10) + delta;
  if (state.currentMonth < 0) {
    state.currentMonth = 11;
    state.currentYear--;
  } else if (state.currentMonth > 11) {
    state.currentMonth = 0;
    state.currentYear++;
  }

  if (state.currentYear < 2026) state.currentYear = 2026;
  if (state.currentYear > 2036) state.currentYear = 2036;

  renderCalendar();
}

async function postMealToggle(dateStr, status, customRate = null) {
  // Optimistic UI update for instant (0ms) responsiveness
  if (status === 'none') {
    delete state.meals[dateStr];
  } else {
    state.meals[dateStr] = {
      date: dateStr,
      status: status,
      rate_snapshot: customRate || 90
    };
  }
  renderCalendar();
  updateDashboardSymmetry();

  try {
    const res = await fetch('/api/meals/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, status, custom_rate: customRate })
    });
    const data = await res.json();
    if (data.success) {
      await refreshAppState();
    }
  } catch (err) {
    console.error("Error toggling meal:", err);
  }
}

// Payments Ledger Table Renderer
function openPaymentsModal() {
  renderPaymentsTable();
  openModal('modal-payments-history');
}

function renderPaymentsTable() {
  const tbody = document.getElementById('payments-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!state.cycles || state.cycles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No payment records logged yet.</td></tr>`;
    return;
  }

  // Deduplicate and render row-wise cycles payments
  const seenCycleNums = new Set();
  let sNo = 1;

  state.cycles.forEach(c => {
    if (seenCycleNums.has(c.cycle_number)) return;
    seenCycleNums.add(c.cycle_number);

    const payments = c.payments || [];
    const initialPayment = payments.length > 0 ? payments[0].amount : (c.total_paid || 0);
    const addOns = payments.length > 1 
      ? payments.slice(1).reduce((sum, p) => sum + p.amount, 0)
      : 0;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="font-weight: 700; color: var(--text-muted);">#${sNo++}</td>
      <td style="font-weight: 700; color: var(--accent-matcha);">Cycle #${c.cycle_number}</td>
      <td>${formatShortDateYear(c.start_date)}</td>
      <td style="font-weight: 700;">₹${initialPayment.toFixed(2)}</td>
      <td style="color: ${addOns > 0 ? 'var(--accent-matcha)' : 'var(--text-muted)'};">₹${addOns.toFixed(2)}</td>
      <td style="font-weight: 800; color: var(--accent-matcha);">₹${c.total_paid.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
}

// Special Meal (Yellow Tile) & Unselect Modal Handlers
let pendingSpecialMealDate = null;

function openSpecialMealModal(dateStr) {
  pendingSpecialMealDate = dateStr;
  const label = document.getElementById('special-meal-date-label');
  if (label) {
    label.innerText = `Meal Options for ${formatDisplayDate(dateStr)}:`;
  }
  const input = document.getElementById('input-special-meal-amount');
  if (input) {
    const currentMeal = state.meals[dateStr];
    input.value = (currentMeal && currentMeal.rate_snapshot) ? currentMeal.rate_snapshot : 300;
  }
  openModal('modal-special-meal');
}

async function submitSpecialMeal() {
  if (!pendingSpecialMealDate) return;
  const input = document.getElementById('input-special-meal-amount');
  const customRate = parseFloat(input.value) || 0;

  if (customRate <= 0) {
    showToast("Please enter a valid expense amount");
    return;
  }

  const dateToUpdate = pendingSpecialMealDate;
  pendingSpecialMealDate = null;
  closeModal('modal-special-meal');

  await postMealToggle(dateToUpdate, 'special', customRate);
}

async function removeMealFromModal() {
  if (!pendingSpecialMealDate) return;
  const dateToUpdate = pendingSpecialMealDate;
  pendingSpecialMealDate = null;
  closeModal('modal-special-meal');

  await postMealToggle(dateToUpdate, 'none');
  showToast("Meal unselected");
}

// Top-Up Payment Handlers
function openTopUpModal() {
  triggerHaptic();
  if (!state.cycles || state.cycles.length === 0) {
    showToast("No active cycles found. Please create a cycle first.");
    openModal('modal-new-cycle');
    return;
  }

  const cycleSelect = document.getElementById('input-topup-cycle');
  if (cycleSelect) {
    let options = '';
    state.cycles.forEach(c => {
      options += `<option value="${c.id}">Cycle #${c.cycle_number} (${formatDisplayDate(c.start_date)} to ${formatDisplayDate(c.end_date)})</option>`;
    });
    cycleSelect.innerHTML = options;
    
    if (state.selectedCycleId !== 'all' && state.cycles.some(c => String(c.id) === String(state.selectedCycleId))) {
      cycleSelect.value = state.selectedCycleId;
    } else {
      cycleSelect.value = String(state.cycles[0].id);
    }
  }

  const amountInput = document.getElementById('input-topup-amount');
  const dateInput = document.getElementById('input-topup-date');
  
  if (amountInput) amountInput.value = '';
  if (dateInput) dateInput.value = getTodayISOString();

  openModal('modal-topup-payment');
}

async function submitTopUpPayment() {
  const cycleSelect = document.getElementById('input-topup-cycle');
  const targetCycleId = cycleSelect ? cycleSelect.value : (state.selectedCycleId !== 'all' ? state.selectedCycleId : '');

  if (!targetCycleId) {
    showToast("Please select a target cycle for the top-up payment");
    return;
  }

  const amount = parseFloat(document.getElementById('input-topup-amount').value) || 0;
  const paid_on = document.getElementById('input-topup-date').value || getTodayISOString();

  if (amount <= 0) {
    showToast("Please enter a valid top-up amount");
    return;
  }

  try {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cycle_id: targetCycleId,
        amount,
        paid_on,
        note: 'Top Up Payment'
      })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-topup-payment');
      showToast(`Added ₹${amount.toFixed(2)} Top-Up Payment!`);
      await refreshAppState();
    } else {
      showToast("Error adding top-up: " + (data.error || 'Failed'));
    }
  } catch (err) {
    console.error("Error submitting top-up payment:", err);
    showToast("Failed to connect to server");
  }
}

// Modals
function openModal(id) {
  triggerHaptic();
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  triggerHaptic();
  document.getElementById(id).classList.remove('active');
}

async function submitNewCycle() {
  const start_date = document.getElementById('input-cycle-start').value;
  const daily_rate = parseFloat(document.getElementById('input-cycle-rate').value);
  const paid_amount = parseFloat(document.getElementById('input-cycle-paid').value);
  const paid_on = document.getElementById('input-cycle-paid-on').value;

  if (!start_date || !daily_rate) {
    return;
  }

  try {
    const res = await fetch('/api/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date, daily_rate, paid_amount, paid_on })
    });
    const data = await res.json();
    if (data.success) {
      state.selectedCycleId = String(data.cycle_id);
      localStorage.setItem('dabba_selected_cycle', state.selectedCycleId);
      closeModal('modal-new-cycle');
      await initData();
    }
  } catch (err) {
    console.error("Failed to create cycle:", err);
  }
}

async function hardResetDatabase() {
  if (!confirm("Are you sure you want to permanently clear all database records (cycles, payments, meals)?")) {
    return;
  }
  triggerHaptic();
  try {
    const res = await fetch('/api/reset-now');
    const data = await res.json();
    if (data.success) {
      state.selectedCycleId = 'all';
      localStorage.removeItem('dabba_selected_cycle');
      closeModal('modal-reset-options');
      await refreshAppState();
      showToast("Database completely cleared!");
    }
  } catch (err) {
    console.error("Failed to reset database:", err);
  }
}

// -------------------------------------------------------------
// WORKSPACE VIEW SWITCHER (Dashboard vs Payments Page)
// -------------------------------------------------------------
function switchView(viewName) {
  triggerHaptic();
  const navDash = document.getElementById('nav-dashboard');
  const navPay = document.getElementById('nav-payments');
  const mNavDash = document.getElementById('mobile-nav-dash');
  const mNavPay = document.getElementById('mobile-nav-pay');
  const viewDash = document.getElementById('view-dashboard');
  const viewPay = document.getElementById('view-payments');

  if (viewName === 'payments') {
    if (navDash) navDash.classList.remove('active');
    if (navPay) navPay.classList.add('active');
    if (mNavDash) mNavDash.classList.remove('active');
    if (mNavPay) mNavPay.classList.add('active');
    if (viewDash) viewDash.classList.add('hidden');
    if (viewPay) viewPay.classList.remove('hidden');
    renderPaymentsView();
  } else {
    if (navPay) navPay.classList.remove('active');
    if (navDash) navDash.classList.add('active');
    if (mNavPay) mNavPay.classList.remove('active');
    if (mNavDash) mNavDash.classList.add('active');
    if (viewPay) viewPay.classList.add('hidden');
    if (viewDash) viewDash.classList.remove('hidden');
  }
}

// Render Payments Workspace View
function renderPaymentsView() {
  const tableBody = document.getElementById('full-payments-table-body');
  const payLogsCount = document.getElementById('pay-kpi-count');
  const payInitial = document.getElementById('pay-kpi-initial');
  const payTopups = document.getElementById('pay-kpi-topups');
  const payTotalLoaded = document.getElementById('pay-kpi-total-loaded');

  if (!tableBody) return;

  let totalPaymentLogsCount = 0;
  let totalInitialPaidSum = 0;
  let totalTopUpsPaidSum = 0;
  let rowsHtml = '';

  state.cycles.forEach((cycle, index) => {
    const sNo = index + 1;
    const cycleNum = `Cycle #${cycle.cycle_number}`;
    const payments = cycle.payments || [];
    
    const initialPaid = payments.length > 0 ? parseFloat(payments[0].amount) : parseFloat(cycle.initial_paid || cycle.total_paid || 0);
    const topUpPaid = payments.length > 1 ? payments.slice(1).reduce((sum, p) => sum + parseFloat(p.amount), 0) : parseFloat(cycle.topup_paid || 0);
    const totalPaid = parseFloat(cycle.total_paid || (initialPaid + topUpPaid));
    const paidDate = formatDisplayDate(cycle.paid_on || cycle.start_date);

    totalPaymentLogsCount += Math.max(1, payments.length);
    totalInitialPaidSum += initialPaid;
    totalTopUpsPaidSum += topUpPaid;

    rowsHtml += `
      <tr>
        <td style="font-weight: 700;">#${sNo}</td>
        <td><span style="display: inline-block; padding: 2px 8px; background: var(--surface-elevated); border: 1px solid var(--border-subtle); border-radius: 9999px; font-weight: 700; color: var(--accent-matcha);">${cycleNum}</span></td>
        <td>${paidDate}</td>
        <td style="font-weight: 700; color: var(--accent-matcha);">₹${initialPaid.toFixed(2)}</td>
        <td>${topUpPaid > 0 ? `<span style="color: var(--accent-emerald); font-weight: 700;">+₹${topUpPaid.toFixed(2)}</span>` : '₹0.00'}</td>
        <td style="font-weight: 800; color: var(--accent-matcha);">₹${totalPaid.toFixed(2)}</td>
      </tr>
    `;
  });

  if (state.cycles.length === 0) {
    rowsHtml = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px 0; font-weight: 600;">
          No payment records found. Start a new cycle to record initial payments.
        </td>
      </tr>
    `;
  }

  tableBody.innerHTML = rowsHtml;

  const grandTotalMoneyLoaded = totalInitialPaidSum + totalTopUpsPaidSum;

  if (payLogsCount) payLogsCount.innerText = totalPaymentLogsCount;
  if (payInitial) payInitial.innerText = `₹${totalInitialPaidSum.toFixed(2)}`;
  if (payTopups) payTopups.innerText = `₹${totalTopUpsPaidSum.toFixed(2)}`;
  if (payTotalLoaded) payTotalLoaded.innerText = `₹${grandTotalMoneyLoaded.toFixed(2)}`;
}

// Open Reset Options Modal & Populate Cycle Selection
function openResetModal() {
  triggerHaptic();
  const select = document.getElementById('reset-cycle-select');
  if (select) {
    let options = `<option value="">-- Choose cycle to delete --</option>`;
    state.cycles.forEach(c => {
      options += `<option value="${c.id}">Cycle #${c.cycle_number} (${formatDisplayDate(c.start_date)} to ${formatDisplayDate(c.end_date)})</option>`;
    });
    select.innerHTML = options;
  }
  openModal('modal-reset-options');
}

// Delete Selected Cycle Handler
async function deleteSelectedCycle() {
  const select = document.getElementById('reset-cycle-select');
  const cycleId = select ? select.value : '';

  if (!cycleId) {
    showToast("Please select a cycle to delete");
    return;
  }

  const selectedCycleObj = state.cycles.find(c => String(c.id) === String(cycleId));
  const cycleName = selectedCycleObj ? `Cycle #${selectedCycleObj.cycle_number}` : `Cycle`;

  if (!confirm(`Are you sure you want to delete ${cycleName} and all its attendance & payment logs?`)) {
    return;
  }

  triggerHaptic();
  try {
    const res = await fetch(`/api/cycles/${cycleId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      if (state.selectedCycleId === String(cycleId)) {
        state.selectedCycleId = 'all';
        localStorage.removeItem('dabba_selected_cycle');
      }
      closeModal('modal-reset-options');
      await refreshAppState();
      showToast(`${cycleName} deleted successfully!`);
    } else {
      showToast("Error deleting cycle: " + (data.error || 'Failed'));
    }
  } catch (err) {
    console.error("Error deleting cycle:", err);
    showToast("Failed to connect to server");
  }
}
