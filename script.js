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

// Storage untuk data history lokal - SIMPAN LEBIH BANYAK DATA
let localHistory = [];
const MAX_HISTORY_ITEMS = 15; // Simpan 15 data terakhir

// =========================
// FUNGSI UTILITAS WAKTU
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
        
        setTimeout(() => {
            if (elements.alerts) elements.alerts.innerHTML = "";
        }, 5000);
    }
}

function setStatus(element, text, className) {
    if (element) {
        element.textContent = text;
        element.className = className;
    }
}

// Format waktu Indonesia
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return {
        time: `${hours}:${minutes}:${seconds}`,
        full: `${hours}:${minutes}:${seconds}`,
        date: date.toLocaleDateString('id-ID')
    };
}

function getCurrentIndonesiaTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// =========================
// FUNGSI CHART - TAMPILKAN LEBIH BANYAK DATA
// =========================
function initializeChart() {
    if (!chartCtx) {
        console.error("❌ Chart context tidak tersedia");
        return;
    }

    if (chart) {
        chart.destroy();
    }

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
                    title: { display: true, text: 'Waktu' },
                    ticks: {
                        maxTicksLimit: 8,
                        callback: function(value, index, values) {
                            if (values.length <= 8) return this.getLabelForValue(value);
                            return index % Math.ceil(values.length / 8) === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    display: true,
                    title: { display: true, text: 'Nilai' },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { display: true, position: 'top' }
            }
        }
    });

    console.log("✅ Chart initialized");
}

function updateChartFromLocalHistory() {
    if (!chart || localHistory.length === 0) {
        console.log("📊 No data available for chart");
        return;
    }

    try {
        // TAMPILKAN SEMUA DATA HISTORY YANG ADA (maksimal 15)
        const displayData = localHistory.slice(-MAX_HISTORY_ITEMS);
        
        console.log("📊 Updating chart with:", displayData.length, "data points");
        console.log("🕒 Current time:", getCurrentIndonesiaTime());
        
        // Format labels dengan waktu yang benar
        const labels = displayData.map(item => {
            return formatTime(item.timestamp).time;
        });

        const tempData = displayData.map(item => item.temperature);
        const levelData = displayData.map(item => item.levelPercent);
        const ntuData = displayData.map(item => item.ntu);

        // Debug: Tampilkan informasi data
        console.log("📈 Data range:", {
            labels: labels,
            temperatures: tempData,
            levels: levelData,
            ntu: ntuData
        });

        // Update chart
        chart.data.labels = labels;
        chart.data.datasets[0].data = tempData;
        chart.data.datasets[1].data = levelData;
        chart.data.datasets[2].data = ntuData;
        
        chart.update('active');
        
        console.log(`✅ Chart updated with ${displayData.length} historical data points`);
        
    } catch (error) {
        console.error("❌ Error updating chart from local history:", error);
    }
}

// =========================
// FUNGSI DATA HANDLING - SIMPAN LEBIH BANYAK DATA
// =========================
async function fetchLatestData() {
    console.log("🔄 Fetching latest data...");
    console.log("🕒 Current time:", getCurrentIndonesiaTime());
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/api/sensor/latest?t=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("✅ Latest data received:", data);
        
        // Update UI dengan data terbaru
        updateUI(data);
        
        // Tambahkan ke local history dengan timestamp sekarang
        addToLocalHistory(data);
        
        // Update chart dengan SEMUA data history
        updateChartFromLocalHistory();
        
    } catch (error) {
        console.error("❌ Error fetching latest data:", error);
        showAlert("Gagal mengambil data terbaru: " + error.message);
    } finally {
        showLoading(false);
    }
}

function addToLocalHistory(data) {
    try {
        const currentTimestamp = Date.now();
        
        console.log("🕒 Adding data at:", formatTime(currentTimestamp).time);

        const historyItem = {
            timestamp: currentTimestamp,
            temperature: parseFloat(data.temperature) || 0,
            levelPercent: parseFloat(data.levelPercent) || 0,
            ntu: parseFloat(data.ntu) || 0,
            levelStatus: data.levelStatus || "",
            turbStatus: data.turbStatus || ""
        };

        // SELALU TAMBAHKAN DATA BARU KE HISTORY
        localHistory.push(historyItem);
        
        // Batasi jumlah data yang disimpan
        if (localHistory.length > MAX_HISTORY_ITEMS) {
            localHistory = localHistory.slice(-MAX_HISTORY_ITEMS);
        }
        
        // Simpan ke localStorage
        localStorage.setItem('sensorHistory', JSON.stringify(localHistory));
        console.log("📝 History updated. Total items:", localHistory.length);
        
    } catch (error) {
        console.error("❌ Error adding to local history:", error);
    }
}

function loadLocalHistory() {
    try {
        const saved = localStorage.getItem('sensorHistory');
        if (saved) {
            localHistory = JSON.parse(saved);
            console.log("📂 Loaded local history:", localHistory.length, "items");
            
            if (localHistory.length > 0) {
                const lastTime = formatTime(localHistory[localHistory.length - 1].timestamp);
                console.log("🕒 Last data time:", lastTime.full);
            }
        }
    } catch (error) {
        console.error("❌ Error loading local history:", error);
        localHistory = [];
    }
}

// FUNGSI BARU: Generate data dummy untuk testing jika tidak ada data
function generateSampleData() {
    if (localHistory.length === 0) {
        console.log("🔧 Generating sample data for testing...");
        
        const now = Date.now();
        const sampleData = [];
        
        // Buat 5 data sample dengan interval 2 menit
        for (let i = 4; i >= 0; i--) {
            const timestamp = now - (i * 2 * 60 * 1000); // 2 menit intervals
            sampleData.push({
                timestamp: timestamp,
                temperature: 25 + Math.random() * 3,
                levelPercent: 45 + Math.random() * 20,
                ntu: Math.random() * 300,
                levelStatus: "SEDANG",
                turbStatus: "JERNIH"
            });
        }
        
        localHistory = sampleData;
        localStorage.setItem('sensorHistory', JSON.stringify(localHistory));
        console.log("✅ Generated", sampleData.length, "sample data points");
    }
}

function updateUI(data) {
    try {
        // Update values dengan data terbaru
        if (elements.temp) elements.temp.textContent = (parseFloat(data.temperature) || 0).toFixed(1) + " °C";
        if (elements.level) elements.level.textContent = (parseFloat(data.levelPercent) || 0).toFixed(1) + "%";
        if (elements.ntu) elements.ntu.textContent = (parseFloat(data.ntu) || 0).toFixed(1);

        // Update status
        updateStatus(data);
        
        // Update last update time display
        updateLastUpdateTime();
        
    } catch (error) {
        console.error("❌ Error updating UI:", error);
    }
}

function updateLastUpdateTime() {
    const timeString = getCurrentIndonesiaTime();
    console.log("🕒 Data updated at:", timeString);
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
    if (data.levelStatus) {
        const statusClass = data.levelStatus.includes("KOSONG") ? "status-danger" : 
                          data.levelStatus.includes("Rendah") ? "status-warning" : "status-good";
        setStatus(elements.levelStatus, data.levelStatus, statusClass);
    } else {
        if (level < 10) {
            setStatus(elements.levelStatus, "Air Kurang - Perlu Ditambah", "status-danger");
        } else if (level <= 70) {
            setStatus(elements.levelStatus, "Stabil", "status-good");
        } else {
            setStatus(elements.levelStatus, "Risiko Meluap", "status-warning");
        }
    }

    // Turbidity status
    if (data.turbStatus) {
        const statusClass = data.turbStatus.includes("EKSTREM") ? "status-danger" : 
                          data.turbStatus.includes("Keruh") ? "status-warning" : "status-good";
        setStatus(elements.ntuStatus, data.turbStatus, statusClass);
    } else {
        if (ntu < 200) {
            setStatus(elements.ntuStatus, "Jernih", "status-good");
        } else if (ntu <= 1000) {
            setStatus(elements.ntuStatus, "Agak Keruh", "status-warning");
        } else {
            setStatus(elements.ntuStatus, "Sangat Keruh - Perlu Sirkulasi", "status-danger");
        }
    }
}

// =========================
// EVENT HANDLERS & GLOBAL FUNCTIONS
// =========================
window.logout = function() {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("sensorHistory");
    window.location.href = "index.html";
};

window.updateData = fetchLatestData;

window.debugHistory = function() {
    console.log("📊 History Debug Info:");
    console.log("- Total history items:", localHistory.length);
    console.log("- Current time:", getCurrentIndonesiaTime());
    
    if (localHistory.length > 0) {
        console.log("- All data points:");
        localHistory.forEach((item, index) => {
            const timeInfo = formatTime(item.timestamp);
            console.log(`  ${index + 1}. ${timeInfo.time} - Temp: ${item.temperature}°C, Level: ${item.levelPercent}%, NTU: ${item.ntu}`);
        });
    } else {
        console.log("- No history data available");
    }
};

window.addTestData = function() {
    // Tambahkan data test untuk melihat multiple data points
    console.log("🧪 Adding test data points...");
    
    const now = Date.now();
    const testData = {
        timestamp: now,
        temperature: 26 + Math.random() * 2,
        levelPercent: 50 + Math.random() * 15,
        ntu: Math.random() * 200,
        levelStatus: "SEDANG",
        turbStatus: "JERNIH"
    };
    
    addToLocalHistory(testData);
    updateChartFromLocalHistory();
    showAlert("Test data added! Total: " + localHistory.length + " data points", false);
};

window.clearHistory = function() {
    localHistory = [];
    localStorage.removeItem('sensorHistory');
    initializeChart();
    showAlert("History cleared!", false);
    console.log("🗑️ Local history cleared");
};

// =========================
// INITIALIZATION - DENGAN DATA HISTORY
// =========================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 DOM Loaded - Initializing Real-time Monitoring with History...");
    console.log("🕒 Current time:", getCurrentIndonesiaTime());
    
    // Load existing history
    loadLocalHistory();
    
    // Generate sample data jika tidak ada data
    generateSampleData();
    
    // Initialize chart
    initializeChart();
    
    // Update chart dengan data history yang ada
    if (localHistory.length > 0) {
        updateChartFromLocalHistory();
    }
    
    // Load data pertama kali
    setTimeout(() => {
        fetchLatestData();
    }, 1000);
    
    // Auto-refresh setiap 10 detik (kurangi frekuensi untuk hindari spam)
    setInterval(fetchLatestData, 10000);
    
    console.log("✅ Real-time monitoring with history initialized (10s interval)");
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error("💥 Global Error:", e.error);
});