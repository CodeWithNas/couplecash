const TRANSACTIONS_KEY = 'transactions';
const SUMMARY_KEY = 'monthlySummary';

// Utility: load transactions from localStorage
function loadTransactions() {
  const data = localStorage.getItem(TRANSACTIONS_KEY);
  return data ? JSON.parse(data) : [];
}

// Utility: save transactions array to localStorage and update summaries
function saveTransactions(transactions) {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  updateMonthlySummaries(transactions);
}

// Load monthly summaries
function loadSummaries() {
  const data = localStorage.getItem(SUMMARY_KEY);
  return data ? JSON.parse(data) : {};
}

// Compute and store summaries by month
function updateMonthlySummaries(transactions) {
  const summary = {};
  transactions.forEach(t => {
    const month = t.date.slice(0, 7); // YYYY-MM
    if (!summary[month]) summary[month] = { income: 0, expenses: 0 };
    if (t.type === 'income') summary[month].income += Number(t.amount);
    else summary[month].expenses += Number(t.amount);
  });
  Object.keys(summary).forEach(m => {
    const s = summary[m];
    s.balance = s.income - s.expenses;
    s.savings = s.balance;
  });
  localStorage.setItem(SUMMARY_KEY, JSON.stringify(summary));
  renderHistoryDropdown();
  renderHistorySummary(document.getElementById('month-select').value);
  updateTrendChart();
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

  transactions.forEach((t, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${t.type}</td>
      <td>$${Number(t.amount).toFixed(2)}</td>
      <td>${t.category}</td>
      <td>${t.date}</td>
      <td>${t.notes || ''}</td>
      <td><button class="delete-btn" data-index="${index}">Delete</button></td>
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
}

// Render history dropdown options
function renderHistoryDropdown() {
  const select = document.getElementById('month-select');
  if (!select) return;
  const summaries = loadSummaries();
  const months = Object.keys(summaries).sort().reverse();
  const current = select.value;
  select.innerHTML = '';
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  });
  if (months.length && !months.includes(current)) {
    select.value = months[0];
  } else {
    select.value = current;
  }
}

// Render summary for selected month
function renderHistorySummary(month) {
  const summaries = loadSummaries();
  const data = summaries[month] || { income: 0, expenses: 0, balance: 0, savings: 0 };
  document.getElementById('history-income').textContent = `$${data.income.toFixed(2)}`;
  document.getElementById('history-expenses').textContent = `$${data.expenses.toFixed(2)}`;
  document.getElementById('history-balance').textContent = `$${data.balance.toFixed(2)}`;
  document.getElementById('history-savings').textContent = `$${data.savings.toFixed(2)}`;
}

// Handle form submission
function handleFormSubmit(event) {
  event.preventDefault();

  const type = document.getElementById('type').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value.trim();
  const date = document.getElementById('date').value;
  const notes = document.getElementById('notes').value.trim();

  if (!type || isNaN(amount) || !category || !date) {
    alert('Please fill in all required fields.');
    return;
  }

  const transactions = loadTransactions();
  transactions.push({ type, amount, category, date, notes });
  saveTransactions(transactions);

  renderTransactions();
  updateSummary();
  updateChart();
  event.target.reset();
}

// Delete transaction by index
function deleteTransaction(index) {
  const transactions = loadTransactions();
  transactions.splice(index, 1);
  saveTransactions(transactions);
  renderTransactions();
  updateSummary();
  updateChart();
}

// ----- Chart.js -----
let chart;
let trendChart;

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

function initTrendChart() {
  const ctx = document.getElementById('trend-chart');
  if (!ctx) return;
  trendChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true } }
    }
  });
  updateTrendChart();
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

function updateTrendChart() {
  if (!trendChart) return;
  const summaries = loadSummaries();
  const months = Object.keys(summaries).sort();
  const incomeData = months.map(m => summaries[m].income);
  const expenseData = months.map(m => summaries[m].expenses);
  const avgExpense = expenseData.length ? (expenseData.reduce((a, b) => a + b, 0) / expenseData.length) : 0;
  const avgData = months.map(() => avgExpense);
  trendChart.data.labels = months;
  trendChart.data.datasets = [
    { label: 'Income', data: incomeData, borderColor: 'green', fill: false },
    { label: 'Expenses', data: expenseData, borderColor: 'red', fill: false },
    { label: 'Avg Expense', data: avgData, borderColor: 'orange', borderDash: [5,5], fill: false }
  ];
  trendChart.update();
}

// Setup event listeners
function init() {
  document.getElementById('transaction-form').addEventListener('submit', handleFormSubmit);
  document.querySelector('#transactions-table tbody').addEventListener('click', e => {
    if (e.target.classList.contains('delete-btn')) {
      deleteTransaction(e.target.dataset.index);
    }
  });

  const monthSelect = document.getElementById('month-select');
  if (monthSelect) {
    monthSelect.addEventListener('change', e => {
      renderHistorySummary(e.target.value);
    });
  }

  renderTransactions();
  updateSummary();
  initChart();
  initTrendChart();

  // ensure summaries exist for stored transactions
  if (Object.keys(loadSummaries()).length === 0) {
    updateMonthlySummaries(loadTransactions());
  } else {
    renderHistoryDropdown();
    renderHistorySummary(monthSelect.value);
    updateTrendChart();
  }
}

document.addEventListener('DOMContentLoaded', init);
