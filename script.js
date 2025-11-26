// =========================
// KONFIGURASI APLIKASI
// =========================
const API_BASE = "https://vaanoimonitoringtambak.vercel.app";

// Threshold untuk peringatan
const ALERT_THRESHOLDS = {
    TEMP_HIGH: 50,      // Suhu di atas 50°C - BERBAHAYA!
    LEVEL_HIGH: 85,     // Level air di atas 85% - RISIKO BANJIR!
    NTU_HIGH: 1800      // Kekeruhan di atas 1800 NTU - SANGAT KERUH!
};

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

// Tracking alert state untuk menghindari spam notifikasi
let alertState = {
    tempHigh: false,
    levelHigh: false,
    ntuHigh: false
};

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

// FUNGSI BARU: Tampilkan peringatan bahaya dengan style khusus
function showDangerAlert(message) {
    console.log("🚨 DANGER ALERT:", message);
    if (elements.alerts) {
        const alertDiv = document.createElement("div");
        alertDiv.className = "alert alert-danger alert-custom danger-alert";
        alertDiv.innerHTML = `
            <div class="danger-alert-content">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>PERINGATAN BAHAYA!</strong>
                <span>${message}</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        elements.alerts.appendChild(alertDiv);
        
        // Auto remove setelah 10 detik untuk alert bahaya
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 10000);
    }
    
    // Tambahkan sound alert (jika diinginkan)
    // playAlertSound();
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
// FUNGSI CHECK ALERT - BARU
// =========================
function checkDangerAlerts(data) {
    const temperature = parseFloat(data.temperature) || 0;
    const levelPercent = parseFloat(data.levelPercent) || 0;
    const ntu = parseFloat(data.ntu) || 0;
    
    const alerts = [];
    const newAlertState = {
        tempHigh: false,
        levelHigh: false,
        ntuHigh: false
    };

    // Check suhu tinggi
    if (temperature > ALERT_THRESHOLDS.TEMP_HIGH) {
        alerts.push({
            type: 'tempHigh',
            message: `🚨 SUHU SANGAT TINGGI! ${temperature}°C - Bahaya untuk ikan!`,
            value: temperature
        });
        newAlertState.tempHigh = true;
        
        // Update status dengan warna danger
        setStatus(elements.tempStatus, `BAHAYA! ${temperature}°C`, "status-danger");
    }

    // Check level air tinggi
    if (levelPercent > ALERT_THRESHOLDS.LEVEL_HIGH) {
        alerts.push({
            type: 'levelHigh',
            message: `🚨 LEVEL AIR KRITIS! ${levelPercent}% - Risiko banjir/bocor!`,
            value: levelPercent
        });
        newAlertState.levelHigh = true;
        
        // Update status dengan warna danger
        setStatus(elements.levelStatus, `BAHAYA! ${levelPercent}%`, "status-danger");
    }

    // Check kekeruhan tinggi
    if (ntu > ALERT_THRESHOLDS.NTU_HIGH) {
        alerts.push({
            type: 'ntuHigh',
            message: `🚨 KUALITAS AIR KRITIS! ${ntu} NTU - Air sangat keruh!`,
            value: ntu
        });
        newAlertState.ntuHigh = true;
        
        // Update status dengan warna danger
        setStatus(elements.ntuStatus, `BAHAYA! ${ntu} NTU`, "status-danger");
    }

    // Cek perubahan state untuk menghindari spam notifikasi
    const shouldShowAlert = 
        (newAlertState.tempHigh && !alertState.tempHigh) ||
        (newAlertState.levelHigh && !alertState.levelHigh) ||
        (newAlertState.ntuHigh && !alertState.ntuHigh);

    // Update alert state
    alertState = newAlertState;

    return {
        alerts: alerts,
        shouldShow: shouldShowAlert
    };
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
        
        // CHECK DANGER ALERTS
        const alertCheck = checkDangerAlerts(data);
        if (alertCheck.shouldShow && alertCheck.alerts.length > 0) {
            alertCheck.alerts.forEach(alert => {
                showDangerAlert(alert.message);
            });
        }
        
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
        const temperature = parseFloat(data.temperature) || 0;
        const levelPercent = parseFloat(data.levelPercent) || 0;
        const ntu = parseFloat(data.ntu) || 0;

        // Update values dengan data terbaru
        if (elements.temp) elements.temp.textContent = temperature.toFixed(1) + " °C";
        if (elements.level) elements.level.textContent = levelPercent.toFixed(1) + "%";
        if (elements.ntu) elements.ntu.textContent = ntu.toFixed(1);

        // Update status (jika tidak dalam kondisi bahaya, gunakan status normal)
        if (!alertState.tempHigh) updateStatus(data);
        
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

    // Temperature status (jika tidak dalam kondisi bahaya)
    if (temp >= 25 && temp <= 30) {
        setStatus(elements.tempStatus, "Ideal (25-30°C)", "status-good");
    } else if (temp < 25) {
        setStatus(elements.tempStatus, "Terlalu Dingin", "status-warning");
    } else if (temp <= 50) {
        setStatus(elements.tempStatus, "Terlalu Panas", "status-warning");
    }

    // Water level status (jika tidak dalam kondisi bahaya)
    if (data.levelStatus && level <= ALERT_THRESHOLDS.LEVEL_HIGH) {
        const statusClass = data.levelStatus.includes("KOSONG") ? "status-danger" : 
                          data.levelStatus.includes("Rendah") ? "status-warning" : "status-good";
        setStatus(elements.levelStatus, data.levelStatus, statusClass);
    } else if (level <= ALERT_THRESHOLDS.LEVEL_HIGH) {
        if (level < 10) {
            setStatus(elements.levelStatus, "Air Kurang - Perlu Ditambah", "status-danger");
        } else if (level <= 70) {
            setStatus(elements.levelStatus, "Stabil", "status-good");
        } else {
            setStatus(elements.levelStatus, "Risiko Meluap", "status-warning");
        }
    }

    // Turbidity status (jika tidak dalam kondisi bahaya)
    if (data.turbStatus && ntu <= ALERT_THRESHOLDS.NTU_HIGH) {
        const statusClass = data.turbStatus.includes("EKSTREM") ? "status-danger" : 
                          data.turbStatus.includes("Keruh") ? "status-warning" : "status-good";
        setStatus(elements.ntuStatus, data.turbStatus, statusClass);
    } else if (ntu <= ALERT_THRESHOLDS.NTU_HIGH) {
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

// FUNGSI BARU: Test alert system
window.testAlerts = function() {
    console.log("🧪 Testing alert system...");
    
    const testData = {
        temperature: 55, // Di atas 50°C
        levelPercent: 90, // Di atas 85%
        ntu: 2000, // Di atas 1800 NTU
        levelStatus: "SEDANG",
        turbStatus: "JERNIH"
    };
    
    const alertCheck = checkDangerAlerts(testData);
    if (alertCheck.alerts.length > 0) {
        alertCheck.alerts.forEach(alert => {
            showDangerAlert(alert.message);
        });
        showAlert("Test alerts triggered! Check the danger alerts above.", false);
    }
};

// FUNGSI BARU: Clear all alerts
window.clearAlerts = function() {
    if (elements.alerts) {
        elements.alerts.innerHTML = "";
    }
    // Reset alert state
    alertState = {
        tempHigh: false,
        levelHigh: false,
        ntuHigh: false
    };
    showAlert("All alerts cleared", false);
};

window.debugHistory = function() {
    console.log("📊 History Debug Info:");
    console.log("- Total history items:", localHistory.length);
    console.log("- Current time:", getCurrentIndonesiaTime());
    console.log("- Alert thresholds:", ALERT_THRESHOLDS);
    console.log("- Current alert state:", alertState);
    
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
    clearAlerts();
    showAlert("History cleared!", false);
    console.log("🗑️ Local history cleared");
};

// =========================
// INITIALIZATION - DENGAN DATA HISTORY
// =========================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 DOM Loaded - Initializing Real-time Monitoring with History...");
    console.log("🕒 Current time:", getCurrentIndonesiaTime());
    console.log("🚨 Alert thresholds configured:", ALERT_THRESHOLDS);
    
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