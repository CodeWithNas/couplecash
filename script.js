// Helper functions for localStorage
function getTransactions() {
  const data = localStorage.getItem('transactions');
  return data ? JSON.parse(data) : [];
}

function saveTransactions(transactions) {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Render transaction history
function renderTransactions() {
  const transactions = getTransactions();
  const tbody = document.querySelector('#transactions-table tbody');
  tbody.innerHTML = '';
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

// Update income, expenses, and balance
function updateSummary() {
  const transactions = getTransactions();
  let income = 0;
  let expenses = 0;
  transactions.forEach(t => {
    if (t.type === 'income') {
      income += Number(t.amount);
    } else {
      expenses += Number(t.amount);
    }
  });
  document.getElementById('total-income').textContent = `$${income.toFixed(2)}`;
  document.getElementById('total-expenses').textContent = `$${expenses.toFixed(2)}`;
  document.getElementById('balance').textContent = `$${(income - expenses).toFixed(2)}`;
}

// Add new transaction
function addTransaction(event) {
  event.preventDefault();
  const type = document.getElementById('type').value;
  const amount = document.getElementById('amount').value;
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;
  const notes = document.getElementById('notes').value;

  if (!amount || isNaN(amount) || !category || !date) {
    alert('Please fill out the form correctly.');
    return;
  }

  const transactions = getTransactions();
  transactions.push({ type, amount: Number(amount), category, date, notes });
  saveTransactions(transactions);
  renderTransactions();
  updateSummary();
  updateChart();
  event.target.reset();
}

// Delete transaction
function deleteTransaction(index) {
  const transactions = getTransactions();
  transactions.splice(index, 1);
  saveTransactions(transactions);
  renderTransactions();
  updateSummary();
  updateChart();
}

// Setup event listeners
function setup() {
  document.getElementById('transaction-form').addEventListener('submit', addTransaction);
  document.querySelector('#transactions-table tbody').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      deleteTransaction(e.target.dataset.index);
    }
  });
  renderTransactions();
  updateSummary();
  initChart();
}

document.addEventListener('DOMContentLoaded', setup);

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
  const transactions = getTransactions().filter(t => t.type === 'expense');
  const categories = {};
  transactions.forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
  });
  chart.data.labels = Object.keys(categories);
  chart.data.datasets[0].data = Object.values(categories);
  chart.data.datasets[0].backgroundColor = chart.data.labels.map(() => `hsl(${Math.random()*360},70%,70%)`);
  chart.update();
}
