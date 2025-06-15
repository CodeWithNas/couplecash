// Utility: load transactions from localStorage
function loadTransactions() {
  const data = localStorage.getItem('transactions');
  return data ? JSON.parse(data) : [];
}

// Utility: save transactions array to localStorage
function saveTransactions(transactions) {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Savings goal utilities
function loadSavingsGoal() {
  const g = localStorage.getItem('savingsGoal');
  return g ? parseFloat(g) : 0;
}

function saveSavingsGoal(goal) {
  localStorage.setItem('savingsGoal', goal);
}

function loadSavingsEvents() {
  const data = localStorage.getItem('savingsEvents');
  return data ? JSON.parse(data) : [];
}

function saveSavingsEvents(events) {
  localStorage.setItem('savingsEvents', JSON.stringify(events));
}

// Render the list of transactions
function renderTransactions() {
  const transactions = loadTransactions();
  const tbody = document.querySelector('#transactions-table tbody');
  const emptyState = document.getElementById('empty-state');

  tbody.innerHTML = '';
  if (transactions.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  // Sort by most recent
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  transactions.forEach(t => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${t.type}</td>
      <td>$${Number(t.amount).toFixed(2)}</td>
      <td>${t.category}</td>
      <td>${t.date}</td>
      <td>${t.notes || ''}</td>
      <td><button class="delete-btn" data-id="${t.id}">Delete</button></td>
    `;
    tbody.appendChild(row);
  });
}

// Update summary totals
function updateSummary() {
  const transactions = loadTransactions();
  let income = 0;
  let expenses = 0;

  transactions.forEach(t => {
    const amount = Number(t.amount);
    if (t.type === 'income') {
      income += amount;
    } else {
      expenses += amount;
    }
  });

  document.getElementById('total-income').textContent = `$${income.toFixed(2)}`;
  document.getElementById('total-expenses').textContent = `$${expenses.toFixed(2)}`;
  document.getElementById('balance').textContent = `$${(income - expenses).toFixed(2)}`;
  updateSavingsProgress();
}

function toggleSavingsField() {
  const typeSelect = document.getElementById('type');
  const group = document.getElementById('savings-group');
  const input = document.getElementById('savings');
  if (!typeSelect || !group) return;
  if (typeSelect.value === 'income') {
    group.classList.remove('hidden');
  } else {
    group.classList.add('hidden');
    if (input) input.value = '';
  }
}

// Handle form submission
function handleFormSubmit(event) {
  event.preventDefault();

  const type = document.getElementById('type').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const savingsInput = document.getElementById('savings');
  const category = document.getElementById('category').value.trim();
  const date = document.getElementById('date').value;
  const notes = document.getElementById('notes').value.trim();

  if (!type || isNaN(amount) || !category || !date) {
    alert('Please fill in all required fields.');
    return;
  }

  let savings = 0;
  if (type === 'income') {
    const val = parseFloat(savingsInput.value);
    savings = isNaN(val) ? 0 : val;
    if (savings > amount) {
      alert('Savings allocation cannot exceed the income amount.');
      return;
    }
  }

  const transactions = loadTransactions();
  transactions.push({ id: Date.now(), type, amount, category, date, notes, savings });
  saveTransactions(transactions);

  renderTransactions();
  updateSummary();
  updateChart();
  event.target.reset();
  savingsInput.value = '';
  toggleSavingsField();
}

// Delete transaction by id
function deleteTransaction(id) {
  const transactions = loadTransactions();
  const index = transactions.findIndex(t => String(t.id) === String(id));
  if (index !== -1) {
    transactions.splice(index, 1);
    saveTransactions(transactions);
    renderTransactions();
    updateSummary();
    updateChart();
  }
}

// ----- Chart.js -----
let chart;

function initChart() {
  const ctx = document.getElementById('expense-chart');
  if (!ctx) return;
  chart = new Chart(ctx, {
    type: 'pie',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
    options: { plugins: { legend: { position: 'bottom' } } }
  });
  updateChart();
}

function updateChart() {
  if (!chart) return;
  const expenses = loadTransactions().filter(t => t.type === 'expense');
  const categories = {};
  expenses.forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
  });
  chart.data.labels = Object.keys(categories);
  chart.data.datasets[0].data = Object.values(categories);
  chart.data.datasets[0].backgroundColor = chart.data.labels.map(() => `hsl(${Math.random()*360},70%,70%)`);
  chart.update();
}

// Calculate savings for the current month and update progress bar
function updateSavingsProgress() {
  const goal = loadSavingsGoal();
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const transactions = loadTransactions().filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const allocated = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.savings || 0), 0);

  const manual = loadSavingsEvents().filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).reduce((sum, e) => sum + Number(e.amount), 0);

  const savings = allocated + manual;

  const progress = document.getElementById('goal-progress');
  const label = document.getElementById('progress-label');
  if (!progress || !label) return;
  progress.max = goal || 0;
  progress.value = savings > 0 ? savings : 0;
  label.textContent = `$${savings.toFixed(2)} / $${goal.toFixed(2)}`;
}

// Setup event listeners
function init() {
  document.getElementById('transaction-form').addEventListener('submit', handleFormSubmit);
  document.querySelector('#transactions-table tbody').addEventListener('click', e => {
    if (e.target.classList.contains('delete-btn')) {
      deleteTransaction(e.target.dataset.id);
    }
  });

  const typeSelect = document.getElementById('type');
  if (typeSelect) {
    typeSelect.addEventListener('change', toggleSavingsField);
  }
  toggleSavingsField();

  const setGoalBtn = document.getElementById('set-goal-btn');
  const addSavingBtn = document.getElementById('add-saving-btn');
  const goalInput = document.getElementById('goal-input');
  const savingInput = document.getElementById('saving-input');

  if (goalInput) goalInput.value = loadSavingsGoal();
  if (setGoalBtn) {
    setGoalBtn.addEventListener('click', () => {
      const val = parseFloat(goalInput.value);
      if (!isNaN(val)) {
        saveSavingsGoal(val);
        updateSavingsProgress();
      }
    });
  }

  if (addSavingBtn) {
    addSavingBtn.addEventListener('click', () => {
      const amt = parseFloat(savingInput.value);
      if (!isNaN(amt) && amt > 0) {
        const events = loadSavingsEvents();
        events.push({ amount: amt, date: new Date().toISOString().slice(0,10) });
        saveSavingsEvents(events);
        savingInput.value = '';
        updateSavingsProgress();
      }
    });
  }

  renderTransactions();
  updateSummary();
  initChart();
}

document.addEventListener('DOMContentLoaded', init);
