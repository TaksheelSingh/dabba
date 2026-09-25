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
    if (paidVal > 0 && rateInput) {
      rateInput.value = (paidVal / 30).toFixed(2);
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
    if (rateVal > 0 && paidInput) {
      paidInput.value = Math.round(rateVal * 30);
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
}

async function initData() {
  await Promise.all([fetchCycles(), fetchMeals(), fetchTelemetry()]);

  // Restore saved cycle selection from localStorage across page refreshes
  const savedCycle = localStorage.getItem('dabba_selected_cycle');
  if (savedCycle && (savedCycle === 'all' || state.cycles.some(c => String(c.id) === String(savedCycle)))) {
    state.selectedCycleId = savedCycle;
  } else {
    state.selectedCycleId = 'all';
  }

  const select = document.getElementById('cycle-select');
  if (select) select.value = state.selectedCycleId;

  updateDashboardSymmetry();
  renderCalendar();
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
  
  select.innerHTML = '<option value="all">All Cycles (Lifetime)</option>';

  state.cycles.forEach((c) => {
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

function showToast(msg) {
  const toast = document.getElementById('toast-msg');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Dashboard Data Updater
function updateDashboardSymmetry() {
  const balanceEl = document.getElementById('kpi-balance');
  const daysCoveredEl = document.getElementById('kpi-days-covered');
  const eatenCntEl = document.getElementById('kpi-eaten-cnt');
  const skippedCntEl = document.getElementById('kpi-skipped-cnt');

  const ledgerTitle = document.getElementById('ledger-cycle-title');
  const ledgerRange = document.getElementById('ledger-range');
  const ledgerRate = document.getElementById('ledger-rate');
  const ledgerPaid = document.getElementById('ledger-paid');
  const ledgerExpense = document.getElementById('ledger-expense');
  const calendarCard = document.getElementById('calendar-card');

  if (state.selectedCycleId === 'all') {
    // Lock calendar visual state in overview mode
    if (calendarCard) calendarCard.classList.add('locked');

    // In All Cycles overview mode, statistics reset to null / 0 defaults
    balanceEl.innerText = `₹0.00`;
    balanceEl.style.color = 'var(--text-muted)';
    daysCoveredEl.innerText = 0;
    eatenCntEl.innerText = 0;
    skippedCntEl.innerText = 0;

    // Clean Ledger Header Title with Cycle Count increment
    ledgerTitle.innerText = `Lifetime Overview (${state.cycles.length})`;
    ledgerRange.innerText = `All Time`;
    ledgerRate.innerText = `Avg ₹0/day`;
    ledgerPaid.innerText = `₹0.00`;
    ledgerExpense.innerText = `₹0.00`;

  } else {
    // Unlock calendar visual state when cycle is selected
    if (calendarCard) calendarCard.classList.remove('locked');

    const cycle = state.cycles.find(c => String(c.id) === String(state.selectedCycleId));
    if (cycle) {
      const bal = cycle.remaining_balance;
      balanceEl.innerText = `₹${bal.toFixed(2)}`;
      balanceEl.style.color = bal >= 0 ? 'var(--accent-matcha)' : 'var(--accent-rose)';

      daysCoveredEl.innerText = cycle.days_covered;
      eatenCntEl.innerText = cycle.eaten_count;
      skippedCntEl.innerText = cycle.skipped_count;

      ledgerTitle.innerText = `Cycle #${cycle.cycle_number}`;
      ledgerRange.innerText = `${formatShortDateYear(cycle.start_date)} - ${formatShortDateYear(cycle.end_date)}`;
      ledgerRate.innerText = `₹${cycle.daily_rate}/day`;
      ledgerPaid.innerText = `₹${cycle.total_paid.toFixed(2)}`;
      ledgerExpense.innerText = `₹${cycle.total_expense.toFixed(2)}`;
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
            tile.title = `Eaten Meal (Standard Rate: ₹${meal.rate_snapshot})`;
          } else if (meal.status === 'special') {
            tile.classList.add('state-special');
            tile.title = `Special Meal (Custom Expense: ₹${meal.rate_snapshot})`;
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
  if (state.selectedCycleId === 'all') {
    showToast("Please select a valid cycle from the dropdown to add top up payment");
    return;
  }
  const amountInput = document.getElementById('input-topup-amount');
  const dateInput = document.getElementById('input-topup-date');
  
  if (amountInput) amountInput.value = '';
  if (dateInput) dateInput.value = getTodayISOString();

  openModal('modal-topup-payment');
}

async function submitTopUpPayment() {
  if (state.selectedCycleId === 'all') {
    showToast("Please select a valid cycle from the dropdown");
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
        cycle_id: state.selectedCycleId,
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
    alert("Please specify start date and daily rate");
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
      state.selectedCycleId = String(data.cycle_id); // Auto-select newly created cycle!
      localStorage.setItem('dabba_selected_cycle', state.selectedCycleId);
      closeModal('modal-new-cycle');
      await initData();
    } else {
      alert("Error: " + data.error);
    }
  } catch (err) {
    alert("Failed to create cycle");
  }
}
