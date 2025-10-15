// SmartSpend Frontend Application
class SmartSpendApp {
    constructor() {
        this.apiBase = 'http://127.0.0.1:8000/api';
        this.token = localStorage.getItem('authToken');
        this.currentUser = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.checkAuth();
    }

    checkAuth() {
        if (this.token) {
            this.showApp();
            this.loadDashboard();
        } else {
            this.showLogin();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const button = e.target.querySelector('button[type="submit"]');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading"></span> Logging in...';
        button.disabled = true;

        const formData = new FormData(e.target);
        const data = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            const response = await fetch(`${this.apiBase}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                this.token = result.token;
                localStorage.setItem('authToken', this.token);
                this.showApp();
                this.loadDashboard();
                this.showToast('Login successful!', 'success');
            } else {
                this.showToast('Invalid credentials. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Login failed:', error);
            this.showToast('Login failed. Please check if the backend is running.', 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const button = e.target.querySelector('button[type="submit"]');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading"></span> Creating account...';
        button.disabled = true;

        const formData = new FormData(e.target);
        const data = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            const response = await fetch(`${this.apiBase}/auth/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showToast('Registration successful! Please login.', 'success');
                this.showLoginForm();
            } else {
                const errorData = await response.json();
                this.showToast(errorData.username || errorData.password || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration failed:', error);
            this.showToast('Registration failed. Please try again.', 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async handleAddTransaction(e) {
        e.preventDefault();
        const button = e.target.querySelector('button[type="submit"]');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading"></span> Adding...';
        button.disabled = true;

        const formData = new FormData(e.target);
        const data = {
            amount: parseFloat(formData.get('amount')),
            type: formData.get('type'),
            category: parseInt(formData.get('category')),
            date: formData.get('date'),
            description: formData.get('description')
        };

        try {
            const response = await fetch(`${this.apiBase}/transactions/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${this.token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showToast('Transaction added successfully!', 'success');
                e.target.reset();
                // Set default date to today
                e.target.querySelector('input[name="date"]').value = new Date().toISOString().split('T')[0];
                this.loadDashboard();
                this.loadTransactions();
            } else {
                this.showToast('Failed to add transaction', 'error');
            }
        } catch (error) {
            this.showToast('Failed to add transaction', 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async loadDashboard() {
        try {
            const [summaryResponse, spendingResponse, monthlyResponse] = await Promise.all([
                fetch(`${this.apiBase}/transactions/summary/`, {
                    headers: {
                        'Authorization': `Token ${this.token}`
                    }
                }),
                fetch(`${this.apiBase}/transactions/spending_by_category/`, {
                    headers: {
                        'Authorization': `Token ${this.token}`
                    }
                }),
                this.getMonthlyData()
            ]);

            if (summaryResponse.ok && spendingResponse.ok) {
                const summary = await summaryResponse.json();
                const spending = await spendingResponse.json();

                this.updateDashboard(summary);
                this.createSpendingChart(spending);
                this.createMonthlyChart(monthlyResponse);
                this.createIncomeVsExpenseChart(summary);
            } else {
                console.error('Failed to load dashboard data');
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async getMonthlyData() {
        // Simulate monthly data - in real app, you'd get this from API
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        return {
            labels: months.slice(0, currentMonth + 1),
            income: Array.from({ length: currentMonth + 1 }, () => Math.floor(Math.random() * 5000) + 2000),
            expenses: Array.from({ length: currentMonth + 1 }, () => Math.floor(Math.random() * 3000) + 1000)
        };
    }

    async loadTransactions() {
        try {
            const response = await fetch(`${this.apiBase}/transactions/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                const transactions = await response.json();
                this.displayTransactions(transactions);
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.apiBase}/categories/`, {
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });

            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('Error loading categories:', error);
            return [];
        }
    }

    updateDashboard(summary) {
        document.getElementById('total-balance').textContent = this.formatCurrency(summary.total_balance);
        document.getElementById('monthly-income').textContent = this.formatCurrency(summary.monthly_income);
        document.getElementById('monthly-expenses').textContent = this.formatCurrency(summary.monthly_expenses);
        document.getElementById('monthly-balance').textContent = this.formatCurrency(summary.monthly_balance);

        // Update progress bars or other visual indicators
        this.updateFinancialHealth(summary);
    }

    updateFinancialHealth(summary) {
        const savingsRate = summary.monthly_income > 0 ?
            ((summary.monthly_income - summary.monthly_expenses) / summary.monthly_income) * 100 : 0;

        const healthElement = document.getElementById('financial-health');
        if (healthElement) {
            let healthStatus, healthClass;
            if (savingsRate >= 20) {
                healthStatus = 'Excellent';
                healthClass = 'text-success';
            } else if (savingsRate >= 10) {
                healthStatus = 'Good';
                healthClass = 'text-warning';
            } else {
                healthStatus = 'Needs Attention';
                healthClass = 'text-danger';
            }
            healthElement.innerHTML = `<span class="${healthClass}">${healthStatus}</span>`;
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    createSpendingChart(spendingData) {
        const ctx = document.getElementById('spendingChart').getContext('2d');

        if (this.charts.spending) {
            this.charts.spending.destroy();
        }

        // Handle empty data
        if (!spendingData || spendingData.length === 0) {
            spendingData = [{ category__name: 'No transactions', total: 1 }];
        }

        this.charts.spending = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: spendingData.map(item => item.category__name || 'Uncategorized'),
                datasets: [{
                    data: spendingData.map(item => parseFloat(item.total)),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: 'Spending by Category'
                    }
                },
                cutout: '60%'
            }
        });
    }

    createMonthlyChart(monthlyData) {
        const ctx = document.getElementById('monthlyTrendChart').getContext('2d');

        if (this.charts.monthly) {
            this.charts.monthly.destroy();
        }

        this.charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [
                    {
                        label: 'Income',
                        data: monthlyData.income,
                        borderColor: '#0a1e77ff',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Expenses',
                        data: monthlyData.expenses,
                        borderColor: '#f72585',
                        backgroundColor: 'rgba(247, 37, 133, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Income vs Expenses'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createIncomeVsExpenseChart(summary) {
        const ctx = document.getElementById('incomeExpenseChart').getContext('2d');

        if (this.charts.incomeExpense) {
            this.charts.incomeExpense.destroy();
        }

        this.charts.incomeExpense = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Current Month'],
                datasets: [
                    {
                        label: 'Income',
                        data: [summary.monthly_income],
                        backgroundColor: '#4361ee',
                        borderRadius: 10
                    },
                    {
                        label: 'Expenses',
                        data: [summary.monthly_expenses],
                        backgroundColor: '#f72585',
                        borderRadius: 10
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Income vs Expenses'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    displayTransactions(transactions) {
        const container = document.getElementById('transactions-list');
        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-receipt fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No transactions yet</h5>
                    <p class="text-muted">Add your first transaction to get started!</p>
                </div>
            `;
            return;
        }

        // Show only last 10 transactions
        const recentTransactions = transactions.slice(0, 10);

        container.innerHTML = recentTransactions.map(transaction => `
            <div class="transaction-item transaction-${transaction.type.toLowerCase()}">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-1 text-center">
                            <i class="fas ${transaction.type === 'INCOME' ? 'fa-arrow-down text-success' : 'fa-arrow-up text-danger'} fa-lg"></i>
                        </div>
                        <div class="col-md-5">
                            <h6 class="card-title mb-1">${transaction.description || 'No description'}</h6>
                            <p class="card-text text-muted small mb-0">
                                <i class="fas fa-tag"></i> ${transaction.category_name || 'Uncategorized'}
                                • <i class="fas fa-calendar"></i> ${new Date(transaction.date).toLocaleDateString()}
                            </p>
                        </div>
                        <div class="col-md-3">
                            <span class="badge ${transaction.type === 'INCOME' ? 'bg-success' : 'bg-danger'}">
                                ${transaction.type}
                            </span>
                        </div>
                        <div class="col-md-3 text-end">
                            <strong class="transaction-amount ${transaction.type === 'INCOME' ? 'text-success' : 'text-danger'}">
                                ${transaction.type === 'INCOME' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showLogin() {
        document.getElementById('app').innerHTML = this.getLoginHTML();
        this.setupAuthEventListeners();
    }

    showApp() {
        document.getElementById('app').innerHTML = this.getAppHTML();
        this.setupAppEventListeners();
        this.loadCategories().then(categories => {
            this.populateCategorySelect(categories);
        });
        this.loadTransactions();
        this.showSection('dashboard');
    }

    setupAuthEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Navigation between login/register
        const showRegister = document.getElementById('show-register');
        if (showRegister) {
            showRegister.addEventListener('click', (e) => this.showRegisterForm(e));
        }

        const showLogin = document.getElementById('show-login');
        if (showLogin) {
            showLogin.addEventListener('click', (e) => this.showLoginForm(e));
        }
    }

    setupAppEventListeners() {
        // Navigation
        document.getElementById('nav-dashboard').addEventListener('click', (e) => this.showSection('dashboard', e));
        document.getElementById('nav-transactions').addEventListener('click', (e) => this.showSection('transactions', e));
        document.getElementById('nav-add-transaction').addEventListener('click', (e) => this.showSection('add-transaction', e));
        document.getElementById('nav-reports').addEventListener('click', (e) => this.showSection('reports', e));
        document.getElementById('nav-logout').addEventListener('click', (e) => this.logout(e));

        // Add transaction form
        document.getElementById('add-transaction-form').addEventListener('submit', (e) => this.handleAddTransaction(e));

        // Quick action buttons
        const quickIncome = document.getElementById('quick-income');
        const quickExpense = document.getElementById('quick-expense');
        if (quickIncome) quickIncome.addEventListener('click', () => this.quickAddTransaction('INCOME'));
        if (quickExpense) quickExpense.addEventListener('click', () => this.quickAddTransaction('EXPENSE'));

        // Set default date to today
        const dateField = document.querySelector('input[name="date"]');
        if (dateField) {
            dateField.value = new Date().toISOString().split('T')[0];
        }
    }

    quickAddTransaction(type) {
        this.showSection('add-transaction');
        document.querySelector('select[name="type"]').value = type;
        document.querySelector('input[name="amount"]').focus();
    }

    showRegisterForm(e) {
        e.preventDefault();
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('register-container').classList.remove('hidden');
    }

    showLoginForm(e) {
        if (e) e.preventDefault();
        document.getElementById('register-container').classList.add('hidden');
        document.getElementById('login-container').classList.remove('hidden');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = 'toast-' + Date.now();

        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        // Remove toast from DOM after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    logout() {
        localStorage.removeItem('authToken');
        this.token = null;
        this.showLogin();
        this.showToast('Logged out successfully', 'success');
    }

    populateCategorySelect(categories) {
        const select = document.getElementById('transaction-category');
        select.innerHTML = categories.map(category =>
            `<option value="${category.id}">${category.name}</option>`
        ).join('');
    }

    showSection(sectionName, e) {
        if (e) e.preventDefault();

        // Hide all sections
        document.querySelectorAll('.app-section').forEach(section => {
            section.classList.add('hidden');
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        targetSection.classList.remove('hidden');
        targetSection.classList.add('fade-in');

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.getElementById(`nav-${sectionName}`).classList.add('active');

        // Load section-specific data
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'transactions':
                this.loadTransactions();
                break;
            case 'reports':
                this.loadReports();
                break;
        }
    }

    async loadReports() {
        // Additional reports can be loaded here
        this.showToast('Reports section loaded', 'info');
    }

    getLoginHTML() {
        return `
        <div class="auth-container">
            <div class="auth-card">
                <div class="auth-header">
                    <h2><i class="fas fa-wallet"></i> FinTraka</h2>
                    <p class="mb-0">Take control of your finances</p>
                </div>
                <div class="auth-body">
                    <div id="login-container">
                        <h4 class="text-center mb-4">Welcome Back</h4>
                        <form id="login-form">
                            <div class="mb-3">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-control" name="username" required placeholder="Enter your username">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Password</label>
                                <input type="password" class="form-control" name="password" required placeholder="Enter your password">
                            </div>
                            <button type="submit" class="btn btn-primary w-100 mb-3">Sign In</button>
                        </form>
                        <p class="text-center mt-3">
                            Don't have an account? 
                            <a href="#" id="show-register" class="text-decoration-none">Sign up here</a>
                        </p>
                    </div>

                    <div id="register-container" class="hidden">
                        <h4 class="text-center mb-4">Create Account</h4>
                        <form id="register-form">
                            <div class="mb-3">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-control" name="username" required placeholder="Choose a username">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" name="email" placeholder="Enter your email">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Password</label>
                                <input type="password" class="form-control" name="password" required placeholder="Create a password">
                            </div>
                            <button type="submit" class="btn btn-success w-100 mb-3">Create Account</button>
                        </form>
                        <p class="text-center mt-3">
                            Already have an account? 
                            <a href="#" id="show-login" class="text-decoration-none">Sign in here</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    getAppHTML() {
        return `
        <div class="container-fluid">
            <div class="row">
                <!-- Sidebar -->
                <nav class="col-md-3 col-lg-2 sidebar">
                    <div class="sidebar-brand">
                        <h4><i class="fas fa-wallet"></i> FinTraka</h4>
                        <small class="text-white-50">Finance Tracker</small>
                    </div>
                    <ul class="nav flex-column sidebar-nav">
                        <li class="nav-item">
                            <a class="nav-link active" href="#" id="nav-dashboard">
                                <i class="fas fa-tachometer-alt"></i> Dashboard
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" id="nav-transactions">
                                <i class="fas fa-exchange-alt"></i> Transactions
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" id="nav-add-transaction">
                                <i class="fas fa-plus-circle"></i> Add Transaction
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" id="nav-reports">
                                <i class="fas fa-chart-bar"></i> Reports
                            </a>
                        </li>
                        <li class="nav-item mt-4">
                            <a class="nav-link" href="#" id="nav-logout">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </a>
                        </li>
                    </ul>
                </nav>

                <!-- Main content -->
                <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-4">
                    <!-- Dashboard Section -->
                    <div id="dashboard-section" class="app-section">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h1 class="h3">Dashboard Overview</h1>
                            <div class="deep-black-date">
                                <i class="fas fa-calendar me-2"></i>
                                ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        </div>

                        <!-- Quick Actions -->
                        <div class="quick-actions">
                            <div class="quick-action-btn" id="quick-income">
                                <i class="fas fa-arrow-down text-success"></i>
                                <div>Quick Income</div>
                            </div>
                            <div class="quick-action-btn" id="quick-expense">
                                <i class="fas fa-arrow-up text-danger"></i>
                                <div>Quick Expense</div>
                            </div>
                        </div>

                        <!-- Summary Cards -->
                        <div class="stats-grid">
                            <div class="dashboard-card card-primary">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <h6 class="card-title">Total Balance</h6>
                                            <h2 id="total-balance" class="mb-0">$0.00</h2>
                                        </div>
                                        <i class="fas fa-wallet fa-2x opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="dashboard-card card-success">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <h6 class="card-title">Monthly Income</h6>
                                            <h2 id="monthly-income" class="mb-0">$0.00</h2>
                                        </div>
                                        <i class="fas fa-arrow-down fa-2x opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="dashboard-card card-danger">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <h6 class="card-title">Monthly Expenses</h6>
                                            <h2 id="monthly-expenses" class="mb-0">$0.00</h2>
                                        </div>
                                        <i class="fas fa-arrow-up fa-2x opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="dashboard-card card-warning">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <h6 class="card-title">Monthly Balance</h6>
                                            <h2 id="monthly-balance" class="mb-0">$0.00</h2>
                                            <small class="opacity-75">Financial Health: <span id="financial-health">-</span></small>
                                        </div>
                                        <i class="fas fa-chart-line fa-2x opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Charts Row -->
                        <div class="row mt-4">
                            <div class="col-lg-4">
                                <div class="chart-container">
                                    <h5><i class="fas fa-chart-pie me-2"></i>Spending Distribution</h5>
                                    <canvas id="spendingChart" height="250"></canvas>
                                </div>
                            </div>
                            <div class="col-lg-8">
                                <div class="chart-container">
                                    <h5><i class="fas fa-chart-line me-2"></i>Monthly Trends</h5>
                                    <canvas id="monthlyTrendChart" height="250"></canvas>
                                </div>
                            </div>
                        </div>

                        <div class="row mt-4">
                            <div class="col-lg-6">
                                <div class="chart-container">
                                    <h5><i class="fas fa-chart-bar me-2"></i>Income vs Expenses</h5>
                                    <canvas id="incomeExpenseChart" height="250"></canvas>
                                </div>
                            </div>
                            <div class="col-lg-6">
                                <div class="chart-container">
                                    <h5><i class="fas fa-receipt me-2"></i>Recent Transactions</h5>
                                    <div id="recent-transactions" style="max-height: 250px; overflow-y: auto;">
                                        <!-- Recent transactions will be loaded here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Transactions Section -->
                    <div id="transactions-section" class="app-section hidden">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h1 class="h3">All Transactions</h1>
                            <button class="btn btn-primary" onclick="app.showSection('add-transaction')">
                                <i class="fas fa-plus me-2"></i>Add Transaction
                            </button>
                        </div>
                        <div id="transactions-list">
                            <!-- Transactions will be loaded here -->
                        </div>
                    </div>

                    <!-- Add Transaction Section -->
                    <div id="add-transaction-section" class="app-section hidden">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h1 class="h3">Add New Transaction</h1>
                            <button class="btn btn-outline-secondary" onclick="app.showSection('transactions')">
                                <i class="fas fa-arrow-left me-2"></i>Back to Transactions
                            </button>
                        </div>
                        <div class="row justify-content-center">
                            <div class="col-lg-6">
                                <div class="dashboard-card">
                                    <div class="card-body">
                                        <form id="add-transaction-form">
                                            <div class="row">
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">Type</label>
                                                    <select class="form-select" name="type" required>
                                                        <option value="INCOME">Income</option>
                                                        <option value="EXPENSE">Expense</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">Amount</label>
                                                    <input type="number" class="form-control" name="amount" step="0.01" min="0.01" placeholder="0.00" required>
                                                </div>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Category</label>
                                                <select class="form-select" name="category" id="transaction-category" required>
                                                    <option value="">Loading categories...</option>
                                                </select>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Date</label>
                                                <input type="date" class="form-control" name="date" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Description</label>
                                                <textarea class="form-control" name="description" rows="3" placeholder="Enter transaction description (optional)"></textarea>
                                            </div>
                                            <button type="submit" class="btn btn-primary w-100">
                                                <i class="fas fa-plus me-2"></i>Add Transaction
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Reports Section -->
                    <div id="reports-section" class="app-section hidden">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h1 class="h3">Financial Reports</h1>
                        </div>
                        <div class="row">
                            <div class="col-12">
                                <div class="chart-container text-center">
                                    <i class="fas fa-chart-area fa-3x text-muted mb-3"></i>
                                    <h5 class="text-muted">Advanced Reports Coming Soon</h5>
                                    <p class="text-muted">We're working on bringing you more detailed financial insights and reports.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
        `;
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SmartSpendApp();
});