// =========================
// KONFIGURASI APLIKASI - SIMPLE VERSION
// =========================
const API_BASE = "https://vaanoimonitoringtambak.vercel.app";

// Cek login
if (!localStorage.getItem("loggedIn")) {
    window.location.href = "index.html";
}

// Element references dengan null checking
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

// Chart element dengan safety check
let chart = null;
let chartCanvas = null;

try {
    chartCanvas = document.getElementById("chart");
    if (chartCanvas) {
        elements.chart = chartCanvas.getContext("2d");
    } else {
        console.error("❌ Canvas chart tidak ditemukan!");
    }
} catch (error) {
    console.error("❌ Error mendapatkan chart context:", error);
}

// =========================
// FUNGSI DASAR - MINIMAL
// =========================
function showLoading(show) {
    if (elements.loading) {
        elements.loading.style.display = show ? "inline-block" : "none";
    }
}

function showAlert(message) {
    console.error("ALERT:", message);
    if (elements.alerts) {
        elements.alerts.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    }
}

// =========================
// FUNGSI UTAMA - SIMPLE
// =========================
async function fetchLatestData() {
    console.log("🔄 Fetching latest data...");
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/api/sensor/latest`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("✅ Latest data:", data);
        
        // Update UI dengan safety check
        if (elements.temp) elements.temp.textContent = (data.temperature || 0).toFixed(1) + " °C";
        if (elements.level) elements.level.textContent = (data.levelPercent || 0).toFixed(1) + "%";
        if (elements.ntu) elements.ntu.textContent = (data.ntu || 0).toFixed(1);
        
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
        const response = await fetch(`${API_BASE}/api/sensor/history`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("✅ History data received, items:", data.length);
        
        if (!data || data.length === 0) {
            console.warn("No history data available");
            return;
        }
        
        // Process data untuk chart
        processChartData(data);
        
    } catch (error) {
        console.error("❌ Error fetching history:", error);
        showAlert("Gagal mengambil data history: " + error.message);
    }
}

function processChartData(data) {
    try {
        // Pastikan data ada
        if (!data || !Array.isArray(data)) {
            console.error("Invalid chart data");
            return;
        }
        
        // Sederhana: ambil 10 data terakhir
        const recentData = data.slice(-10);
        
        const labels = recentData.map(item => {
            const date = new Date(item.timestamp || Date.now());
            return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        });
        
        const tempData = recentData.map(item => item.temperature || 0);
        const levelData = recentData.map(item => item.levelPercent || 0);
        const ntuData = recentData.map(item => item.ntu || 0);
        
        console.log("📊 Chart data prepared:", { labels, tempData, levelData, ntuData });
        
        createChart(labels, tempData, levelData, ntuData);
        
    } catch (error) {
        console.error("❌ Error processing chart data:", error);
    }
}

function createChart(labels, tempData, levelData, ntuData) {
    try {
        // Destroy existing chart
        if (chart) {
            chart.destroy();
        }
        
        // Safety check untuk chart canvas
        if (!elements.chart) {
            console.error("Chart context not available");
            return;
        }
        
        console.log("🎨 Creating chart...");
        
        // Buat chart sederhana
        chart = new Chart(elements.chart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Suhu (°C)',
                        data: tempData,
                        borderColor: 'red',
                        backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        borderWidth: 2,
                        tension: 0.4
                    },
                    {
                        label: 'Level Air (%)',
                        data: levelData,
                        borderColor: 'blue',
                        backgroundColor: 'rgba(0, 0, 255, 0.1)',
                        borderWidth: 2,
                        tension: 0.4
                    },
                    {
                        label: 'Kekeruhan (NTU)',
                        data: ntuData,
                        borderColor: 'green',
                        backgroundColor: 'rgba(0, 255, 0, 0.1)',
                        borderWidth: 2,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        console.log("✅ Chart created successfully");
        
    } catch (error) {
        console.error("❌ Error creating chart:", error);
    }
}

// =========================
// EVENT HANDLERS
// =========================
window.logout = function() {
    localStorage.removeItem("loggedIn");
    window.location.href = "index.html";
};

window.updateData = fetchLatestData;
window.updateChart = fetchHistoryData;

// =========================
// TEST FUNCTIONS
// =========================
window.testAPI = async function() {
    console.log("🧪 Testing API connection...");
    
    try {
        const response = await fetch(`${API_BASE}/api/sensor/latest`);
        console.log("API Test Response:", {
            status: response.status,
            ok: response.ok
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("API Test Data:", data);
            alert("✅ API Connected! Check console for details.");
        } else {
            alert("❌ API Error: " + response.status);
        }
    } catch (error) {
        console.error("API Test Failed:", error);
        alert("❌ API Test Failed: " + error.message);
    }
};

window.testChart = function() {
    console.log("🧪 Testing chart with dummy data...");
    
    const labels = ['10:00', '10:05', '10:10', '10:15'];
    const tempData = [25, 26, 27, 26.5];
    const levelData = [50, 55, 60, 58];
    const ntuData = [100, 150, 200, 180];
    
    createChart(labels, tempData, levelData, ntuData);
    alert("✅ Chart test completed! Check console.");
};

// =========================
// INITIALIZATION - SAFE
// =========================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 DOM Loaded - Initializing...");
    
    // Test dulu basic functionality
    setTimeout(() => {
        console.log("🔧 Starting initial data load...");
        fetchLatestData();
        fetchHistoryData();
    }, 1000);
    
    // Setup auto-refresh
    setInterval(fetchLatestData, 10000);
    setInterval(fetchHistoryData, 30000);
});

// Global error handler untuk catch error yang tidak tertangkap
window.addEventListener('error', function(e) {
    console.error("💥 Global Error:", e.error);
    showAlert("Terjadi error: " + e.error.message);
});