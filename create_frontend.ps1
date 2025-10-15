# create_frontend.ps1 - Creates all frontend files and folders for SmartSpend

# Create frontend directory
New-Item -ItemType Directory -Path "frontend" -Force

# Create all HTML, CSS, and JS files
$files = @{
    "frontend/index.html" = @'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartSpend - Personal Finance Tracker</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="app">
        <!-- Content will be loaded by JavaScript -->
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="app.js"></script>
</body>
</html>
'@

    "frontend/styles.css" = @'
.sidebar {
    min-height: 100vh;
    background-color: #f8f9fa;
}
.transaction-income {
    border-left: 4px solid #28a745;
}
.transaction-expense {
    border-left: 4px solid #dc3545;
}
.dashboard-card {
    transition: transform 0.2s;
}
.dashboard-card:hover {
    transform: translateY(-2px);
}
.hidden {
    display: none !important;
}
.loading {
    opacity: 0.6;
    pointer-events: none;
}
'@

    "frontend/app.js" = @'
// SmartSpend Frontend Application
class SmartSpendApp {
    constructor() {
        this.apiBase = 'http://localhost:8000/api';
        this.token = localStorage.getItem('authToken');
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
    }

    checkAuth() {
        if (this.token) {
            this.showApp();
            this.loadDashboard();
        } else {
            this.showLogin();
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        
        // Register form
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Add transaction form
        document.getElementById('add-transaction-form').addEventListener('submit', (e) => this.handleAddTransaction(e));
        
        // Navigation
        document.getElementById('show-register').addEventListener('click', (e) => this.showRegisterForm(e));
        document.getElementById('show-login').addEventListener('click', (e) => this.showLoginForm(e));
    }

    async handleLogin(e) {
        e.preventDefault();
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
                this.showMessage('Login successful!', 'success');
            } else {
                this.showMessage('Invalid credentials', 'error');
            }
        } catch (error) {
            this.showMessage('Login failed. Please try again.', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
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
                this.showMessage('Registration successful! Please login.', 'success');
                this.showLoginForm();
            } else {
                const error = await response.json();
                this.showMessage(error.detail || 'Registration failed', 'error');
            }
        } catch (error) {
            this.showMessage('Registration failed. Please try again.', 'error');
        }
    }

    async handleAddTransaction(e) {
        e.preventDefault();
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
                this.showMessage('Transaction added successfully!', 'success');
                e.target.reset();
                this.loadDashboard();
                this.loadTransactions();
            } else {
                this.showMessage('Failed to add transaction', 'error');
            }
        } catch (error) {
            this.showMessage('Failed to add transaction', 'error');
        }
    }

    async loadDashboard() {
        try {
            const [summaryResponse, spendingResponse] = await Promise.all([
                fetch(`${this.apiBase}/transactions/summary/`, {
                    headers: {
                        'Authorization': `Token ${this.token}`
                    }
                }),
                fetch(`${this.apiBase}/transactions/spending_by_category/`, {
                    headers: {
                        'Authorization': `Token ${this.token}`
                    }
                })
            ]);

            if (summaryResponse.ok && spendingResponse.ok) {
                const summary = await summaryResponse.json();
                const spending = await spendingResponse.json();
                
                this.updateDashboard(summary);
                this.createSpendingChart(spending);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
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
        document.getElementById('total-balance').textContent = `$${summary.total_balance}`;
        document.getElementById('monthly-income').textContent = `$${summary.monthly_income}`;
        document.getElementById('monthly-expenses').textContent = `$${summary.monthly_expenses}`;
        document.getElementById('monthly-balance').textContent = `$${summary.monthly_balance}`;
    }

    createSpendingChart(spendingData) {
        const ctx = document.getElementById('spendingChart').getContext('2d');
        
        if (this.spendingChart) {
            this.spendingChart.destroy();
        }

        this.spendingChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: spendingData.map(item => item.category__name || 'Uncategorized'),
                datasets: [{
                    data: spendingData.map(item => item.total),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    displayTransactions(transactions) {
        const container = document.getElementById('transactions-list');
        container.innerHTML = transactions.map(transaction => `
            <div class="card mb-2 transaction-${transaction.type.toLowerCase()}">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="card-title">${transaction.description || 'No description'}</h6>
                            <p class="card-text text-muted small">${transaction.category_name || 'Uncategorized'} • ${new Date(transaction.date).toLocaleDateString()}</p>
                        </div>
                        <div class="col-md-4">
                            <span class="badge ${transaction.type === 'INCOME' ? 'bg-success' : 'bg-danger'}">
                                ${transaction.type}
                            </span>
                        </div>
                        <div class="col-md-2 text-end">
                            <strong>$${transaction.amount}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showLogin() {
        document.getElementById('app').innerHTML = this.getLoginHTML();
        this.setupEventListeners();
    }

    showApp() {
        document.getElementById('app').innerHTML = this.getAppHTML();
        this.setupAppEventListeners();
        this.loadCategories().then(categories => {
            this.populateCategorySelect(categories);
        });
        this.loadTransactions();
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

    showMessage(message, type) {
        // Simple message display - you can enhance this with toast notifications
        alert(`${type.toUpperCase()}: ${message}`);
    }

    logout() {
        localStorage.removeItem('authToken');
        this.token = null;
        this.showLogin();
    }

    populateCategorySelect(categories) {
        const select = document.getElementById('transaction-category');
        select.innerHTML = categories.map(category => 
            `<option value="${category.id}">${category.name}</option>`
        ).join('');
    }

    setupAppEventListeners() {
        // Navigation
        document.getElementById('nav-dashboard').addEventListener('click', (e) => this.showSection('dashboard', e));
        document.getElementById('nav-transactions').addEventListener('click', (e) => this.showSection('transactions', e));
        document.getElementById('nav-add-transaction').addEventListener('click', (e) => this.showSection('add-transaction', e));
        document.getElementById('nav-logout').addEventListener('click', (e) => this.logout(e));

        // Add transaction form is already set up in main setup
    }

    showSection(sectionName, e) {
        if (e) e.preventDefault();
        
        // Hide all sections
        document.querySelectorAll('.app-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Show selected section
        document.getElementById(`${sectionName}-section`).classList.remove('hidden');
        
        // Load section-specific data
        switch(sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'transactions':
                this.loadTransactions();
                break;
        }
    }

    getLoginHTML() {
        return `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h3 class="card-title text-center">SmartSpend</h3>
                            <p class="text-center text-muted">Track your finances easily</p>
                            
                            <div id="login-container">
                                <h5>Login</h5>
                                <form id="login-form">
                                    <div class="mb-3">
                                        <label class="form-label">Username</label>
                                        <input type="text" class="form-control" name="username" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Password</label>
                                        <input type="password" class="form-control" name="password" required>
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100">Login</button>
                                </form>
                                <p class="text-center mt-3">
                                    Don't have an account? 
                                    <a href="#" id="show-register">Register here</a>
                                </p>
                            </div>

                            <div id="register-container" class="hidden">
                                <h5>Register</h5>
                                <form id="register-form">
                                    <div class="mb-3">
                                        <label class="form-label">Username</label>
                                        <input type="text" class="form-control" name="username" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control" name="email">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Password</label>
                                        <input type="password" class="form-control" name="password" required>
                                    </div>
                                    <button type="submit" class="btn btn-success w-100">Register</button>
                                </form>
                                <p class="text-center mt-3">
                                    Already have an account? 
                                    <a href="#" id="show-login">Login here</a>
                                </p>
                            </div>
                        </div>
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
                <nav class="col-md-3 col-lg-2 d-md-block sidebar">
                    <div class="position-sticky pt-3">
                        <h5 class="px-3"><i class="fas fa-wallet"></i> SmartSpend</h5>
                        <ul class="nav flex-column">
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
                                <a class="nav-link" href="#" id="nav-logout">
                                    <i class="fas fa-sign-out-alt"></i> Logout
                                </a>
                            </li>
                        </ul>
                    </div>
                </nav>

                <!-- Main content -->
                <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                    <!-- Dashboard Section -->
                    <div id="dashboard-section" class="app-section">
                        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                            <h1 class="h2">Dashboard</h1>
                        </div>

                        <!-- Summary Cards -->
                        <div class="row">
                            <div class="col-md-3 mb-4">
                                <div class="card dashboard-card bg-primary text-white">
                                    <div class="card-body">
                                        <h6 class="card-title">Total Balance</h6>
                                        <h3 id="total-balance">$0.00</h3>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-4">
                                <div class="card dashboard-card bg-success text-white">
                                    <div class="card-body">
                                        <h6 class="card-title">Monthly Income</h6>
                                        <h3 id="monthly-income">$0.00</h3>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-4">
                                <div class="card dashboard-card bg-danger text-white">
                                    <div class="card-body">
                                        <h6 class="card-title">Monthly Expenses</h6>
                                        <h3 id="monthly-expenses">$0.00</h3>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-4">
                                <div class="card dashboard-card bg-info text-white">
                                    <div class="card-body">
                                        <h6 class="card-title">Monthly Balance</h6>
                                        <h3 id="monthly-balance">$0.00</h3>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Charts -->
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-body">
                                        <h5 class="card-title">Spending by Category</h5>
                                        <canvas id="spendingChart" width="400" height="400"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Transactions Section -->
                    <div id="transactions-section" class="app-section hidden">
                        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                            <h1 class="h2">Transactions</h1>
                        </div>
                        <div id="transactions-list">
                            <!-- Transactions will be loaded here -->
                        </div>
                    </div>

                    <!-- Add Transaction Section -->
                    <div id="add-transaction-section" class="app-section hidden">
                        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                            <h1 class="h2">Add Transaction</h1>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-body">
                                        <form id="add-transaction-form">
                                            <div class="mb-3">
                                                <label class="form-label">Type</label>
                                                <select class="form-select" name="type" required>
                                                    <option value="INCOME">Income</option>
                                                    <option value="EXPENSE">Expense</option>
                                                </select>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Amount</label>
                                                <input type="number" class="form-control" name="amount" step="0.01" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Category</label>
                                                <select class="form-select" name="category" id="transaction-category" required>
                                                    <!-- Categories will be populated dynamically -->
                                                </select>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Date</label>
                                                <input type="date" class="form-control" name="date" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Description</label>
                                                <textarea class="form-control" name="description" rows="3"></textarea>
                                            </div>
                                            <button type="submit" class="btn btn-primary">Add Transaction</button>
                                        </form>
                                    </div>
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
document.addEventListener('DOMContentLoaded', () => {
    new SmartSpendApp();
});
'@
}

# Create each file
foreach ($file in $files.GetEnumerator()) {
    $filePath = $file.Key
    $content = $file.Value
    
    # Create directory if it doesn't exist
    $directory = [System.IO.Path]::GetDirectoryName($filePath)
    if (!(Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory -Force
    }
    
    # Create file
    Set-Content -Path $filePath -Value $content
    Write-Host "Created: $filePath"
}

Write-Host "`nFrontend files created successfully!"
Write-Host "`nNext steps:"
Write-Host "1. Make sure your Django backend is running on http://localhost:8000"
Write-Host "2. Open frontend/index.html in your browser"
Write-Host "3. Register a new user and start adding transactions!"