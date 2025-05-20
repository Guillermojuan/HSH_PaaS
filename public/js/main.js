// API endpoints
const API_ENDPOINTS = {
    test: '/api/test',
    salesByBranch: '/api/dashboard/sales-by-branch',
    topProducts: '/api/dashboard/top-products',
    salesPerformance: '/api/dashboard/sales-performance',
    inventorySummary: '/api/dashboard/inventory-summary',
    feedback: '/api/feedback',
    branches: '/api/branches'
};

// Fetch data from API
async function fetchData(endpoint) {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// Update inventory summary
function updateInventorySummary(data) {
    if (!data) return;
    
    document.getElementById('totalProducts').textContent = data.totalProducts || 0;
    document.getElementById('lowStockProducts').textContent = data.lowStockProducts || 0;
    document.getElementById('totalValue').textContent = `$${(data.totalValue || 0).toLocaleString()}`;
    document.getElementById('totalBranches').textContent = data.totalBranches || 0;
}

// Create sales by branch chart
function createSalesByBranchChart(data) {
    const ctx = document.getElementById('salesByBranchChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.branchName),
            datasets: [{
                label: 'Ventas por Sucursal',
                data: data.map(item => item.totalSales),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `$${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

// Create top products chart
function createTopProductsChart(data) {
    const ctx = document.getElementById('topProductsChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(item => item.productName),
            datasets: [{
                data: data.map(item => item.totalSold),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)'
                ]
            }]
        },
        options: {
            responsive: true
        }
    });
}

// Create sales performance chart
function createSalesPerformanceChart(data) {
    const ctx = document.getElementById('salesPerformanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => new Date(item.date).toLocaleDateString()),
            datasets: [{
                label: 'Ventas Diarias',
                data: data.map(item => item.totalSales),
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `$${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

// Load branches for feedback form
async function loadBranches() {
    const branches = await fetchData(API_ENDPOINTS.branches);
    if (!branches) return;

    const branchSelect = document.getElementById('branch');
    branches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = `${branch.name} - ${branch.location}`;
        branchSelect.appendChild(option);
    });
}

// Load feedback list
async function loadFeedback() {
    const feedback = await fetchData(API_ENDPOINTS.feedback);
    if (!feedback) return;

    const feedbackList = document.getElementById('feedbackList');
    feedbackList.innerHTML = feedback.map(item => `
        <div class="feedback-item">
            <div class="name">${item.name}</div>
            <div class="email">${item.email}</div>
            <div class="message">${item.message}</div>
            ${item.branchName ? `<div class="branch"><strong>Sucursal:</strong> ${item.branchName}</div>` : ''}
            <div class="date"><strong>Fecha:</strong> ${new Date(item.created_at).toLocaleString()}</div>
            <div class="status"><strong>Estado:</strong> ${item.status || 'pending'}</div>
        </div>
    `).join('');
}

// Handle feedback form submission
async function handleFeedbackSubmit(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        message: document.getElementById('message').value,
        branch_id: document.getElementById('branch').value || null
    };

    try {
        const response = await fetch(API_ENDPOINTS.feedback, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Error submitting feedback');

        // Clear form
        event.target.reset();
        
        // Reload feedback list
        loadFeedback();

        // Show success message
        alert('¡Gracias por tu feedback!');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al enviar el feedback. Por favor, intenta nuevamente.');
    }
}

// Initialize dashboard
async function initializeDashboard() {
    // Test API connection
    const testResult = await fetchData(API_ENDPOINTS.test);
    if (!testResult) {
        console.error('API connection failed');
        return;
    }

    // Fetch and update all dashboard data
    const [salesByBranch, topProducts, salesPerformance, inventorySummary] = await Promise.all([
        fetchData(API_ENDPOINTS.salesByBranch),
        fetchData(API_ENDPOINTS.topProducts),
        fetchData(API_ENDPOINTS.salesPerformance),
        fetchData(API_ENDPOINTS.inventorySummary)
    ]);

    // Update UI with fetched data
    if (salesByBranch) createSalesByBranchChart(salesByBranch);
    if (topProducts) createTopProductsChart(topProducts);
    if (salesPerformance) createSalesPerformanceChart(salesPerformance);
    if (inventorySummary) updateInventorySummary(inventorySummary);

    // Initialize feedback section
    loadBranches();
    loadFeedback();

    // Add feedback form submit handler
    document.getElementById('feedbackForm').addEventListener('submit', handleFeedbackSubmit);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Si estamos en el dashboard, inicializa todo
    if (document.getElementById('salesByBranchChart')) {
        initializeDashboard();
    }
    // Si existe el select de sucursales, cárgalo
    if (document.getElementById('branch')) {
        loadBranches();
    }
}); 