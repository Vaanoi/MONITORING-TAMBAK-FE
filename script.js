// =========================
// KONFIGURASI APLIKASI
// =========================
const API_BASE = "https://vaanoimonitoringtambak.vercel.app";

// Cek login
if (!localStorage.getItem("loggedIn")) {
    window.location.href = "index.html";
}

// Element references
const elements = {
    temp: document.getElementById("temp"),
    tempStatus: document.getElementById("tempStatus"),
    level: document.getElementById("level"),
    levelStatus: document.getElementById("levelStatus"),
    ntu: document.getElementById("ntu"),
    ntuStatus: document.getElementById("ntuStatus"),
    loading: document.getElementById("loading"),
    alerts: document.getElementById("alerts")
};

// Chart setup
let chart = null;
const chartCanvas = document.getElementById("chart");
const chartCtx = chartCanvas ? chartCanvas.getContext("2d") : null;

// =========================
// FUNGSI UTILITAS
// =========================
function showLoading(show) {
    if (elements.loading) {
        elements.loading.style.display = show ? "inline-block" : "none";
    }
}

function showAlert(message, isError = true) {
    console.log(isError ? "❌ " : "✅ ", message);
    if (elements.alerts) {
        const alertClass = isError ? "alert-danger" : "alert-success";
        elements.alerts.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
        
        // Auto remove alert setelah 5 detik
        setTimeout(() => {
            if (elements.alerts) elements.alerts.innerHTML = "";
        }, 5000);
    }
}

// =========================
// FUNGSI CHART - FIXED
// =========================
function initializeChart() {
    if (!chartCtx) {
        console.error("❌ Chart context tidak tersedia");
        return;
    }

    // Destroy existing chart
    if (chart) {
        chart.destroy();
    }

    // Create empty chart first
    chart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Suhu (°C)',
                    data: [],
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Level Air (%)',
                    data: [],
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Kekeruhan (NTU)',
                    data: [],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Waktu'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Nilai'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });

    console.log("✅ Chart initialized");
}

function updateChartData(labels, tempData, levelData, ntuData) {
    if (!chart) {
        console.error("❌ Chart belum diinisialisasi");
        return;
    }

    try {
        // Update chart data
        chart.data.labels = labels;
        chart.data.datasets[0].data = tempData;
        chart.data.datasets[1].data = levelData;
        chart.data.datasets[2].data = ntuData;

        // Update chart
        chart.update('active');
        console.log("✅ Chart updated dengan", labels.length, "data points");
        
    } catch (error) {
        console.error("❌ Error updating chart:", error);
    }
}

// =========================
// FUNGSI DATA HANDLING - FIXED
// =========================
async function fetchLatestData() {
    console.log("🔄 Fetching latest data...");
    
    try {
        showLoading(true);
        
        // Gunakan cache buster
        const response = await fetch(`${API_BASE}/api/sensor/latest?t=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("✅ Latest data received:", data);
        
        // Update UI
        updateUI(data);
        
    } catch (error) {
        console.error("❌ Error fetching latest data:", error);
        showAlert("Gagal mengambil data terbaru: " + error.message);
    } finally {
        showLoading(false);
    }
}

async function fetchHistoryData() {
    console.log("🔄 Fetching history data...");
    
    try {
        // Gunakan cache buster
        const response = await fetch(`${API_BASE}/api/sensor/history?t=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("✅ History data received, items:", data.length);
        
        if (!data || data.length === 0) {
            console.warn("No history data available");
            showAlert("Data history kosong", false);
            return;
        }
        
        // Process dan update chart
        processAndUpdateChart(data);
        
    } catch (error) {
        console.error("❌ Error fetching history:", error);
        showAlert("Gagal mengambil data history: " + error.message);
    }
}

function updateUI(data) {
    try {
        // Update values dengan default fallback
        if (elements.temp) elements.temp.textContent = (parseFloat(data.temperature) || 0).toFixed(1) + " °C";
        if (elements.level) elements.level.textContent = (parseFloat(data.levelPercent) || 0).toFixed(1) + "%";
        if (elements.ntu) elements.ntu.textContent = (parseFloat(data.ntu) || 0).toFixed(1);

        // Update status
        updateStatus(data);
        
    } catch (error) {
        console.error("❌ Error updating UI:", error);
    }
}

function updateStatus(data) {
    const temp = parseFloat(data.temperature) || 0;
    const level = parseFloat(data.levelPercent) || 0;
    const ntu = parseFloat(data.ntu) || 0;

    // Temperature status
    if (temp >= 25 && temp <= 30) {
        setStatus(elements.tempStatus, "Ideal (25-30°C)", "status-good");
    } else if (temp < 25) {
        setStatus(elements.tempStatus, "Terlalu Dingin", "status-warning");
    } else {
        setStatus(elements.tempStatus, "Terlalu Panas", "status-warning");
    }

    // Water level status
    if (level < 10) {
        setStatus(elements.levelStatus, "Air Kurang - Perlu Ditambah", "status-danger");
    } else if (level <= 70) {
        setStatus(elements.levelStatus, "Stabil", "status-good");
    } else {
        setStatus(elements.levelStatus, "Risiko Meluap", "status-warning");
    }

    // Turbidity status
    if (ntu < 200) {
        setStatus(elements.ntuStatus, "Jernih", "status-good");
    } else if (ntu <= 1000) {
        setStatus(elements.ntuStatus, "Agak Keruh", "status-warning");
    } else {
        setStatus(elements.ntuStatus, "Sangat Keruh - Perlu Sirkulasi", "status-danger");
    }
}

function setStatus(element, text, className) {
    if (element) {
        element.textContent = text;
        element.className = className;
    }
}

function processAndUpdateChart(data) {
    try {
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn("❌ No valid data for chart");
            return;
        }

        // Urutkan data berdasarkan timestamp
        const sortedData = [...data].sort((a, b) => {
            return (a.timestamp || 0) - (b.timestamp || 0);
        });

        // Ambil maksimal 20 data terbaru untuk performance
        const recentData = sortedData.slice(-20);
        
        console.log("📊 Processing chart data:", recentData.length, "items");

        // Prepare labels (waktu)
        const labels = recentData.map(item => {
            const date = new Date(item.timestamp || Date.now());
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        });

        // Prepare data values
        const tempData = recentData.map(item => parseFloat(item.temperature) || 0);
        const levelData = recentData.map(item => parseFloat(item.levelPercent) || 0);
        const ntuData = recentData.map(item => parseFloat(item.ntu) || 0);

        console.log("📈 Chart data ready:", {
            labels: labels.length,
            temperatures: tempData,
            levels: levelData,
            ntu: ntuData
        });

        // Update chart dengan data baru
        updateChartData(labels, tempData, levelData, ntuData);
        
        showAlert(`Chart updated dengan ${recentData.length} data points`, false);
        
    } catch (error) {
        console.error("❌ Error processing chart data:", error);
        showAlert("Error memproses data chart: " + error.message);
    }
}

// =========================
// EVENT HANDLERS & GLOBAL FUNCTIONS
// =========================
window.logout = function() {
    localStorage.removeItem("loggedIn");
    window.location.href = "index.html";
};

window.updateData = fetchLatestData;
window.updateChart = fetchHistoryData;

// =========================
// DEBUG FUNCTIONS
// =========================
window.debugChart = function() {
    console.log("🔍 Chart Debug Info:");
    console.log("- Chart instance:", chart ? "Exists" : "Null");
    console.log("- Chart canvas:", chartCanvas ? "Exists" : "Null");
    console.log("- Chart context:", chartCtx ? "Exists" : "Null");
    
    if (chart) {
        console.log("- Chart data:", {
            labels: chart.data.labels,
            datasets: chart.data.datasets.map(d => ({
                label: d.label,
                dataPoints: d.data.length
            }))
        });
    }
    
    // Test dengan data dummy
    const testLabels = ['10:00', '10:05', '10:10', '10:15', '10:20'];
    const testTemp = [25, 26, 27, 26.5, 26];
    const testLevel = [50, 55, 60, 58, 59];
    const testNtu = [100, 150, 200, 180, 190];
    
    updateChartData(testLabels, testTemp, testLevel, testNtu);
    showAlert("Debug: Chart diupdate dengan data test", false);
};

window.forceRefresh = function() {
    console.log("🔄 Force refreshing all data...");
    fetchLatestData();
    fetchHistoryData();
};

// =========================
// INITIALIZATION - IMPROVED
// =========================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 DOM Loaded - Initializing application...");
    
    // Initialize chart first
    initializeChart();
    
    // Load initial data setelah chart siap
    setTimeout(() => {
        console.log("📥 Loading initial data...");
        fetchLatestData();
        fetchHistoryData();
    }, 500);
    
    // Setup auto-refresh
    setInterval(fetchLatestData, 10000); // 10 detik untuk data terbaru
    setInterval(fetchHistoryData, 30000); // 30 detik untuk history
    
    console.log("✅ Auto-refresh configured");
});

// Error handling global
window.addEventListener('error', function(e) {
    console.error("💥 Global Error:", e.error);
    showAlert("Terjadi error: " + e.error?.message || "Unknown error");
});