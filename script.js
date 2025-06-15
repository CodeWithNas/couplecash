// Utility: load transactions from localStorage
function loadTransactions() {
  const data = localStorage.getItem('transactions');
  return data ? JSON.parse(data) : [];
}

// Utility: save transactions array to localStorage
function saveTransactions(transactions) {
  localStorage.setItem('transactions', JSON.stringify(transactions));
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

// Setup event listeners
function init() {
  document.getElementById('transaction-form').addEventListener('submit', handleFormSubmit);
  document.querySelector('#transactions-table tbody').addEventListener('click', e => {
    if (e.target.classList.contains('delete-btn')) {
      deleteTransaction(e.target.dataset.index);
    }
  });

  renderTransactions();
  updateSummary();
  initChart();
}

document.addEventListener('DOMContentLoaded', init);
