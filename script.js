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

// Storage untuk data history lokal
let localHistory = [];

// =========================
// FUNGSI UTILITAS WAKTU - DIPERBAIKI
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

// FUNGSI BARU: Format waktu yang benar
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return {
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`,
        full: date.toLocaleTimeString('id-ID'),
        date: date.toLocaleDateString('id-ID')
    };
}

// FUNGSI BARU: Handle timestamp dari Firebase
function parseFirebaseTimestamp(timestamp) {
    // Jika timestamp dari Firebase berupa angka kecil (seperti 650150), 
    // kemungkinan itu adalah detik, bukan milidetik
    if (timestamp && timestamp < 1000000000) {
        console.log("🕒 Firebase timestamp detected (seconds):", timestamp);
        return timestamp * 1000; // Convert detik ke milidetik
    }
    
    // Jika timestamp sudah dalam milidetik, gunakan langsung
    if (timestamp && timestamp > 1000000000000) {
        return timestamp;
    }
    
    // Jika tidak valid, gunakan waktu sekarang
    console.log("🕒 Using current time for timestamp");
    return Date.now();
}

// =========================
// FUNGSI CHART - DIPERBAIKI
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
                        maxTicksLimit: 8, // Max 8 label untuk readability
                        callback: function(value, index, values) {
                            // Hanya tampilkan beberapa label untuk menghindari overcrowding
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
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            // Tampilkan waktu lengkap di tooltip
                            const dataIndex = tooltipItems[0].dataIndex;
                            const label = tooltipItems[0].chart.data.labels[dataIndex];
                            return `Waktu: ${label}`;
                        }
                    }
                }
            }
        }
    });

    console.log("✅ Chart initialized");
}

function updateChartFromLocalHistory() {
    if (!chart || localHistory.length === 0) return;

    try {
        // Ambil maksimal 15 data terbaru untuk performance
        const recentData = localHistory.slice(-15);
        
        console.log("📊 Updating chart with:", recentData.length, "data points");
        
        // Format labels dengan waktu yang benar
        const labels = recentData.map(item => {
            const timeInfo = formatTime(item.timestamp);
            return timeInfo.time;
        });

        const tempData = recentData.map(item => item.temperature);
        const levelData = recentData.map(item => item.levelPercent);
        const ntuData = recentData.map(item => item.ntu);

        // Debug: Tampilkan data terbaru
        if (recentData.length > 0) {
            const latest = recentData[recentData.length - 1];
            const latestTime = formatTime(latest.timestamp);
            console.log("🕒 Latest data time:", latestTime.full);
        }

        // Update chart
        chart.data.labels = labels;
        chart.data.datasets[0].data = tempData;
        chart.data.datasets[1].data = levelData;
        chart.data.datasets[2].data = ntuData;
        
        chart.update('active');
        
        console.log(`✅ Chart updated at ${new Date().toLocaleTimeString()}`);
        
    } catch (error) {
        console.error("❌ Error updating chart from local history:", error);
    }
}

// =========================
// FUNGSI DATA HANDLING - DIPERBAIKI
// =========================
async function fetchLatestData() {
    console.log("🔄 Fetching latest data...");
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/api/sensor/latest?t=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("✅ Latest data received:", data);
        
        // Update UI
        updateUI(data);
        
        // Tambahkan ke local history dengan timestamp yang benar
        addToLocalHistory(data);
        
        // Update chart dengan data real-time
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
        // Parse timestamp dengan benar
        const correctedTimestamp = parseFirebaseTimestamp(data.timestamp);
        const now = Date.now();
        
        console.log("🕒 Timestamp info:", {
            original: data.timestamp,
            corrected: correctedTimestamp,
            current: now,
            difference: now - correctedTimestamp
        });

        const historyItem = {
            timestamp: correctedTimestamp,
            temperature: parseFloat(data.temperature) || 0,
            levelPercent: parseFloat(data.levelPercent) || 0,
            ntu: parseFloat(data.ntu) || 0,
            levelStatus: data.levelStatus || "",
            turbStatus: data.turbStatus || ""
        };

        // Cek apakah data benar-benar baru (beda dengan data terakhir)
        const isNewData = localHistory.length === 0 || 
                         (correctedTimestamp - localHistory[localHistory.length - 1].timestamp) > 5000; // 5 detik

        if (isNewData) {
            localHistory.push(historyItem);
            
            // Simpan ke localStorage untuk persistensi
            if (localHistory.length > 30) { // Max 30 data points
                localHistory = localHistory.slice(-30);
            }
            
            localStorage.setItem('sensorHistory', JSON.stringify(localHistory));
            console.log("📝 Added to local history at:", formatTime(correctedTimestamp).full);
        } else {
            console.log("⏭️ Skipping duplicate data");
        }
        
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
            
            // Tampilkan waktu data terakhir
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

function updateUI(data) {
    try {
        // Update values
        if (elements.temp) elements.temp.textContent = (parseFloat(data.temperature) || 0).toFixed(1) + " °C";
        if (elements.level) elements.level.textContent = (parseFloat(data.levelPercent) || 0).toFixed(1) + "%";
        if (elements.ntu) elements.ntu.textContent = (parseFloat(data.ntu) || 0).toFixed(1);

        // Update status
        updateStatus(data);
        
        // Update last update time
        updateLastUpdateTime();
        
    } catch (error) {
        console.error("❌ Error updating UI:", error);
    }
}

// FUNGSI BARU: Tampilkan waktu update terakhir
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID');
    const dateString = now.toLocaleDateString('id-ID');
    
    console.log("🕒 Data updated at:", timeString);
    
    // Bisa tambahkan elemen untuk menampilkan waktu update jika mau
    // Contoh: document.getElementById('lastUpdate').textContent = `Terakhir update: ${timeString}`;
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

    // Water level status - gunakan status dari Firebase jika ada
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

    // Turbidity status - gunakan status dari Firebase jika ada
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

window.debugTime = function() {
    console.log("🕒 Time Debug Info:");
    console.log("- Current time:", new Date().toLocaleString('id-ID'));
    console.log("- Local history length:", localHistory.length);
    
    if (localHistory.length > 0) {
        console.log("- Latest 3 data points:");
        localHistory.slice(-3).forEach((item, index) => {
            const timeInfo = formatTime(item.timestamp);
            console.log(`  ${index + 1}. ${timeInfo.full} - Temp: ${item.temperature}°C`);
        });
    }
    
    console.log("- Chart instance:", chart ? "Exists" : "Null");
};

window.simulateNewData = function() {
    // Fungsi untuk testing: tambah data dummy dengan timestamp sekarang
    const testData = {
        timestamp: Date.now(),
        temperature: 25 + Math.random() * 5,
        levelPercent: 40 + Math.random() * 30,
        ntu: Math.random() * 500,
        levelStatus: "SEDANG",
        turbStatus: "JERNIH"
    };
    
    addToLocalHistory(testData);
    updateChartFromLocalHistory();
    showAlert("Data test ditambahkan!", false);
};

// =========================
// INITIALIZATION - DIPERBAIKI
// =========================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 DOM Loaded - Initializing REAL-TIME monitoring...");
    console.log("🕒 Current time:", new Date().toLocaleString('id-ID'));
    
    // Load existing history dari localStorage
    loadLocalHistory();
    
    // Initialize chart
    initializeChart();
    
    // Jika ada history, update chart
    if (localHistory.length > 0) {
        updateChartFromLocalHistory();
    }
    
    // Load data pertama kali
    setTimeout(() => {
        fetchLatestData();
    }, 1000);
    
    // Auto-refresh data terbaru setiap 5 detik
    setInterval(fetchLatestData, 5000);
    
    console.log("✅ Real-time monitoring initialized (5s interval)");
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error("💥 Global Error:", e.error);
});