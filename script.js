// =============================================
// AQUA SENSE — MULTI-DEVICE EDITION
// Real-time water quality monitoring
// =============================================

'use strict';

// =============================================
// ANIMATED GAUGE CLASS
// =============================================

class AnimatedGauge {
    constructor(canvasId, size = 180) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.warn(`Canvas ${canvasId} not found`);
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.size = size;
        this.value = 0;
        this.targetValue = 0;
        this.animationFrame = null;
        this.trendHistory = [];
        
        this.canvas.width = size;
        this.canvas.height = size;
        
        this.animate();
    }
    
    update(value) {
        this.targetValue = Math.min(100, Math.max(0, value));
        this.trendHistory.push(value);
        if (this.trendHistory.length > 10) this.trendHistory.shift();
        this.updateTrendDisplay();
    }
    
    updateTrendDisplay() {
        if (this.trendHistory.length < 2) return;
        
        const oldAvg = this.trendHistory.slice(0, -5).reduce((a,b) => a+b, 0) / Math.max(1, this.trendHistory.length - 5);
        const newAvg = this.trendHistory.slice(-5).reduce((a,b) => a+b, 0) / 5;
        const change = ((newAvg - oldAvg) / oldAvg * 100).toFixed(1);
        
        const trendElement = document.getElementById('gaugeTrend');
        if (trendElement) {
            trendElement.textContent = `${change > 0 ? '+' : ''}${change}%`;
            trendElement.style.color = change > 0 ? '#00ff9d' : '#ff6b35';
        }
        
        const peakElement = document.getElementById('gaugePeak');
        if (peakElement && this.trendHistory.length > 0) {
            peakElement.textContent = Math.max(...this.trendHistory);
        }
    }
    
    animate() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        
        const animateStep = () => {
            this.value += (this.targetValue - this.value) * 0.12;
            this.draw();
            
            if (Math.abs(this.targetValue - this.value) > 0.5) {
                this.animationFrame = requestAnimationFrame(animateStep);
            } else {
                this.value = this.targetValue;
                this.draw();
            }
        };
        
        animateStep();
    }
    
    draw() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.size, this.size);
        const center = this.size / 2;
        const radius = this.size * 0.38;
        
        const bgGradient = this.ctx.createLinearGradient(0, 0, this.size, this.size);
        bgGradient.addColorStop(0, 'rgba(0, 212, 255, 0.05)');
        bgGradient.addColorStop(1, 'rgba(0, 100, 150, 0.1)');
        
        this.ctx.beginPath();
        this.ctx.arc(center, center, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = bgGradient;
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
        this.ctx.lineWidth = this.size * 0.05;
        this.ctx.stroke();
        
        const angle = (this.value / 100) * Math.PI * 2 - Math.PI / 2;
        const gradient = this.ctx.createLinearGradient(0, 0, this.size, this.size);
        
        let color1, color2;
        if (this.value >= 90) {
            color1 = '#00ff9d';
            color2 = '#00d4ff';
        } else if (this.value >= 70) {
            color1 = '#00d4ff';
            color2 = '#00f5d4';
        } else if (this.value >= 50) {
            color1 = '#ffd700';
            color2 = '#ffaa00';
        } else if (this.value >= 25) {
            color1 = '#ff6b35';
            color2 = '#ff8c42';
        } else {
            color1 = '#ff2d55';
            color2 = '#ff4757';
        }
        
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        
        this.ctx.beginPath();
        this.ctx.arc(center, center, radius, -Math.PI / 2, angle);
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = this.size * 0.05;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.arc(center, center, radius * 0.7, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fill();
        
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = color1;
        this.ctx.fillStyle = color1;
        this.ctx.font = `bold ${this.size * 0.16}px Orbitron`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${Math.round(this.value)}`, center, center - 5);
        
        this.ctx.shadowBlur = 5;
        this.ctx.fillStyle = '#8ab8cc';
        this.ctx.font = `${this.size * 0.06}px Exo 2`;
        this.ctx.fillText('WQI', center, center + radius * 0.5);
        
        this.ctx.shadowBlur = 0;
        
        for (let i = 0; i <= 100; i += 10) {
            const dotAngle = (i / 100) * Math.PI * 2 - Math.PI / 2;
            const x = center + (radius + 8) * Math.cos(dotAngle);
            const y = center + (radius + 8) * Math.sin(dotAngle);
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = i <= this.value ? color1 : 'rgba(255, 255, 255, 0.2)';
            this.ctx.fill();
        }
    }
}

// =============================================
// LOADING SKELETONS
// =============================================

function showSkeletons() {
    const cards = document.querySelectorAll('.compact-card');
    cards.forEach(card => {
        if (!card.classList.contains('loading')) {
            card.classList.add('loading');
            const valueSpan = card.querySelector('.compact-value');
            if (valueSpan && !card.dataset.originalValue) {
                card.dataset.originalValue = valueSpan.textContent;
                valueSpan.textContent = '---';
            }
        }
    });
}

function hideSkeletons() {
    const cards = document.querySelectorAll('.compact-card');
    cards.forEach(card => {
        card.classList.remove('loading');
        const valueSpan = card.querySelector('.compact-value');
        if (valueSpan && card.dataset.originalValue) {
            valueSpan.textContent = card.dataset.originalValue;
        }
    });
}

// =============================================
// DATA COMPARISON CLASS
// =============================================

class DataComparison {
    constructor() {
        this.selectedDevices = [];
        this.comparisonChart = null;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const openBtn = document.getElementById('openComparisonBtn');
        if (openBtn) {
            const newOpenBtn = openBtn.cloneNode(true);
            openBtn.parentNode.replaceChild(newOpenBtn, openBtn);
            newOpenBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showComparisonModal();
            });
        }
        
        const closeBtn = document.getElementById('closeComparison');
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', () => {
                document.getElementById('comparisonModal').classList.remove('show');
            });
        }
        
        const exportBtn = document.getElementById('exportComparison');
        if (exportBtn) {
            const newExportBtn = exportBtn.cloneNode(true);
            exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
            newExportBtn.addEventListener('click', () => {
                this.exportComparisonData();
            });
        }
        
        const refreshBtn = document.getElementById('refreshComparison');
        if (refreshBtn) {
            const newRefreshBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
            newRefreshBtn.addEventListener('click', () => {
                this.updateComparison();
            });
        }
    }
    
    showComparisonModal() {
        const modal = document.getElementById('comparisonModal');
        const selector = document.getElementById('deviceSelector');
        
        if (!modal || !selector) return;
        
        if (!window.devices || window.devices.length === 0) {
            const saved = localStorage.getItem('aqua_devices');
            if (saved) {
                window.devices = JSON.parse(saved);
            } else {
                window.devices = [{
                    id: 'device_1',
                    name: 'Main Station',
                    location: 'River Monitoring Point'
                }];
            }
        }
        
        selector.innerHTML = window.devices.map(device => `
            <label class="device-checkbox">
                <input type="checkbox" value="${device.id}" data-device-name="${this.escapeHtml(device.name)}">
                <span class="checkbox-label">
                    <strong>${this.escapeHtml(device.name)}</strong>
                    <small>${this.escapeHtml(device.location)}</small>
                </span>
            </label>
        `).join('');
        
        selector.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!this.selectedDevices.includes(e.target.value)) {
                        this.selectedDevices.push(e.target.value);
                    }
                } else {
                    this.selectedDevices = this.selectedDevices.filter(id => id !== e.target.value);
                }
                this.updateComparison();
            });
        });
        
        modal.classList.add('show');
        this.updateComparison();
    }
    
    async updateComparison() {
        if (this.selectedDevices.length === 0) {
            const statsDiv = document.getElementById('comparisonStats');
            if (statsDiv) {
                statsDiv.innerHTML = '<div class="stat-card"><p>Select devices to compare</p></div>';
            }
            return;
        }
        
        const comparisonData = [];
        
        for (const deviceId of this.selectedDevices) {
            try {
                const response = await fetch(`/api/history?device=${deviceId}&n=30`);
                const data = await response.json();
                const device = window.devices.find(d => d.id === deviceId);
                
                if (data.readings && data.readings.length > 0) {
                    comparisonData.push({
                        name: device ? device.name : deviceId,
                        id: deviceId,
                        readings: data.readings
                    });
                }
            } catch (error) {
                console.error('Failed to fetch device data:', error);
            }
        }
        
        if (comparisonData.length > 0) {
            this.renderComparisonChart(comparisonData);
            this.renderComparisonStats(comparisonData);
        }
    }
    
    renderComparisonChart(data) {
        const ctx = document.getElementById('comparisonChart');
        if (!ctx) return;
        
        if (this.comparisonChart) {
            this.comparisonChart.destroy();
        }
        
        const maxLength = Math.max(...data.map(d => d.readings.length));
        
        const datasets = data.map((device, index) => ({
            label: device.name,
            data: device.readings.slice(-maxLength).map(r => r.ph),
            borderColor: `hsl(${index * 60}, 70%, 55%)`,
            backgroundColor: `hsla(${index * 60}, 70%, 55%, 0.1)`,
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3
        }));
        
        this.comparisonChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: maxLength}, (_, i) => `Point ${i+1}`),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top', labels: { color: getChartLabelColor() } },
                    title: { display: true, text: 'pH Level Comparison Across Devices', color: 'var(--aqua)' }
                },
                scales: { y: { title: { display: true, text: 'pH Level' }, ticks: { color: getChartTickColor() }, min: 6, max: 9 } }
            }
        });
    }
    
    renderComparisonStats(data) {
        const statsDiv = document.getElementById('comparisonStats');
        if (!statsDiv) return;
        
        statsDiv.innerHTML = data.map(device => {
            const readings = device.readings;
            const avgPh = (readings.reduce((sum, r) => sum + r.ph, 0) / readings.length).toFixed(2);
            const avgTurbidity = (readings.reduce((sum, r) => sum + r.turbidity, 0) / readings.length).toFixed(2);
            
            let phStatus = 'safe';
            if (avgPh < 6.5 || avgPh > 8.5) phStatus = 'danger';
            else if (avgPh < 7 || avgPh > 8) phStatus = 'moderate';
            
            return `
                <div class="stat-card">
                    <h4>${this.escapeHtml(device.name)}</h4>
                    <div class="stat-row"><span>📊 Avg pH:</span><strong style="color: ${phStatus === 'danger' ? '#ff2d55' : phStatus === 'moderate' ? '#ffd700' : '#00ff9d'}">${avgPh}</strong></div>
                    <div class="stat-row"><span>🌊 Avg Turbidity:</span><strong>${avgTurbidity} NTU</strong></div>
                    <div class="stat-row"><span>📈 Readings:</span><strong>${readings.length}</strong></div>
                </div>
            `;
        }).join('');
    }
    
    exportComparisonData() {
        alert('Export comparison data - feature coming soon');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// =============================================
// EXPORT DATA FUNCTIONS
// =============================================

function exportToCSV() {
    if (history.timestamp.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }
    
    let csv = ['Timestamp,pH,Turbidity (NTU),TDS (ppm),Temperature (°C)'];
    
    for (let i = 0; i < history.timestamp.length; i++) {
        csv.push(`${history.timestamp[i]},${history.ph[i]?.toFixed(2) || 'N/A'},${history.turbidity[i]?.toFixed(2) || 'N/A'},${history.tds[i]?.toFixed(1) || 'N/A'},${history.temp[i]?.toFixed(1) || 'N/A'}`);
    }
    
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aqua_sense_data_${new Date().toISOString().slice(0,19)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert(`Exported ${history.timestamp.length} readings to CSV`, 'success');
}

function exportToJSON() {
    if (history.timestamp.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }
    
    const exportData = {
        exportedAt: new Date().toISOString(),
        deviceId: activeDeviceId,
        deviceName: devices.find(d => d.id === activeDeviceId)?.name || 'Unknown',
        readings: []
    };
    
    for (let i = 0; i < history.timestamp.length; i++) {
        exportData.readings.push({
            timestamp: history.timestamp[i],
            ph: history.ph[i],
            turbidity: history.turbidity[i],
            tds: history.tds[i],
            temperature: history.temp[i]
        });
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aqua_sense_data_${new Date().toISOString().slice(0,19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert(`Exported ${exportData.readings.length} readings to JSON`, 'success');
}

function initExportButton() {
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const choice = confirm('Export as CSV? (OK = CSV, Cancel = JSON)');
            if (choice) {
                exportToCSV();
            } else {
                exportToJSON();
            }
        });
    }
}

// =============================================
// DATE RANGE PICKER
// =============================================

let originalHistoryData = null;

function storeOriginalHistory() {
    originalHistoryData = {
        timestamp: [...history.timestamp],
        ph: [...history.ph],
        turbidity: [...history.turbidity],
        tds: [...history.tds],
        temp: [...history.temp]
    };
}

function filterHistoryByDateRange(fromDate, toDate) {
    if (!originalHistoryData) storeOriginalHistory();
    
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const filteredIndices = [];
    
    for (let i = 0; i < originalHistoryData.timestamp.length; i++) {
        const currentDate = new Date(originalHistoryData.timestamp[i]);
        if (currentDate >= from && currentDate <= to) {
            filteredIndices.push(i);
        }
    }
    
    if (filteredIndices.length === 0) {
        showAlert('No data found in selected date range', 'warning');
        return false;
    }
    
    history.timestamp = filteredIndices.map(i => originalHistoryData.timestamp[i]);
    history.ph = filteredIndices.map(i => originalHistoryData.ph[i]);
    history.turbidity = filteredIndices.map(i => originalHistoryData.turbidity[i]);
    history.tds = filteredIndices.map(i => originalHistoryData.tds[i]);
    history.temp = filteredIndices.map(i => originalHistoryData.temp[i]);
    
    updateAllGraphs();
    showAlert(`Showing ${filteredIndices.length} readings from selected range`, 'success');
    return true;
}

function resetDateRange() {
    if (originalHistoryData) {
        history.timestamp = [...originalHistoryData.timestamp];
        history.ph = [...originalHistoryData.ph];
        history.turbidity = [...originalHistoryData.turbidity];
        history.tds = [...originalHistoryData.tds];
        history.temp = [...originalHistoryData.temp];
        updateAllGraphs();
        showAlert('Date range reset, showing all data', 'success');
    }
    
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
}

function initDateRangePicker() {
    const applyBtn = document.getElementById('applyDateRange');
    const resetBtn = document.getElementById('resetDateRange');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    
    if (!applyBtn || !resetBtn) return;
    
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateFrom) dateFrom.value = yesterday.toISOString().slice(0, 16);
    if (dateTo) dateTo.value = now.toISOString().slice(0, 16);
    
    applyBtn.addEventListener('click', () => {
        if (dateFrom.value && dateTo.value) {
            filterHistoryByDateRange(dateFrom.value, dateTo.value);
        } else {
            showAlert('Please select both From and To dates', 'warning');
        }
    });
    
    resetBtn.addEventListener('click', resetDateRange);
}

// =============================================
// CONFIGURATION
// =============================================

const API_URL = '/api/data';
const HISTORY_URL = '/api/history';
const PORTS_URL = '/api/ports';
const WS_URL = '';
const REFRESH_MS = 2000;

const THRESHOLDS = {
    ph: { safeMin: 6.5, safeMax: 8.5, warnMin: 5.5, warnMax: 9.5 },
    turbidity: { safeMax: 4, warnMax: 25 },
    tds: { safeMax: 500, warnMax: 1000 },
    temp: { safeMin: 10, safeMax: 35, warnMin: 5, warnMax: 40 },
};

// =============================================
// GLOBAL STATE
// =============================================

let mainChart = null;
let currentGraphParam = 'all';
let currentTimeframe = 30;
let socket = null;
let isFirstFetch = true;
let currentEditingId = null;
let devices = [];
let activeDeviceId = null;
let deviceDataHistory = {};

const history = { ph: [], turbidity: [], tds: [], temp: [], timestamp: [] };
const graphs = {};

// =============================================
// DOM ELEMENTS
// =============================================

const els = {
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.querySelector('.theme-icon'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    statusBanner: document.getElementById('statusBanner'),
    statusIcon: document.getElementById('statusIcon'),
    statusText: document.getElementById('statusText'),
    lastUpdate: document.getElementById('lastUpdate'),
    apiDot: document.getElementById('apiDot'),
    apiMsg: document.getElementById('apiMsg'),
    wqiNum: document.getElementById('wqiNum'),
    wqiLabel: document.getElementById('wqiLabel'),
    ringFill: document.getElementById('ringFill'),
    valPh: document.getElementById('val-ph'),
    valTurbidity: document.getElementById('val-turbidity'),
    valTds: document.getElementById('val-tds'),
    valTemp: document.getElementById('val-temp'),
    badgePh: document.getElementById('badge-ph'),
    badgeTurbidity: document.getElementById('badge-turbidity'),
    badgeTds: document.getElementById('badge-tds'),
    badgeTemp: document.getElementById('badge-temp'),
    waterFill: document.getElementById('waterFill'),
    waterQuality: document.getElementById('waterQuality'),
    healthScore: document.getElementById('healthScore')
};

// =============================================
// DEVICE MANAGEMENT
// =============================================

function loadDevices() {
    const saved = localStorage.getItem('aqua_devices');
    if (saved) {
        devices = JSON.parse(saved);
    } else {
        devices = [{
            id: 'device_1',
            name: 'Main Station',
            location: 'River Monitoring Point',
            port: 'auto',
            baud: 9600,
            description: 'Primary monitoring station',
            status: 'offline',
            lastSeen: null,
            createdAt: new Date().toISOString()
        }];
        saveDevices();
    }
    
    if (devices.length > 0 && !activeDeviceId) {
        activeDeviceId = devices[0].id;
    }
    
    renderDeviceList();
    updateActiveDeviceDisplay();
}

function saveDevices() {
    localStorage.setItem('aqua_devices', JSON.stringify(devices));
    updateTotalDevices();
}

function addDevice(device) {
    const newDevice = {
        id: 'device_' + Date.now(),
        status: 'offline',
        lastSeen: null,
        createdAt: new Date().toISOString(),
        ...device
    };
    devices.push(newDevice);
    saveDevices();
    renderDeviceList();
    return newDevice;
}

function updateDevice(id, updates) {
    const index = devices.findIndex(d => d.id === id);
    if (index !== -1) {
        devices[index] = { ...devices[index], ...updates };
        saveDevices();
        renderDeviceList();
        if (activeDeviceId === id) updateActiveDeviceDisplay();
    }
}

function deleteDevice(id) {
    if (devices.length === 1) {
        showAlert('Cannot delete the last device', 'warning');
        return;
    }
    
    devices = devices.filter(d => d.id !== id);
    if (activeDeviceId === id) {
        activeDeviceId = devices[0].id;
        switchDevice(activeDeviceId);
    }
    saveDevices();
    renderDeviceList();
    updateActiveDeviceDisplay();
}

function switchDevice(deviceId) {
    activeDeviceId = deviceId;
    updateActiveDeviceDisplay();
    clearCurrentData();
    loadDeviceHistory(deviceId);
    
    if (socket && socket.connected) {
        socket.emit('subscribe_device', deviceId);
    }
    
    fetchSensorData();
    showAlert(`Switched to ${devices.find(d => d.id === deviceId)?.name}`, 'info');
}

function updateActiveDeviceDisplay() {
    const device = devices.find(d => d.id === activeDeviceId);
    const displayElement = document.getElementById('activeDeviceName');
    const subtitleElement = document.getElementById('currentDeviceSubtitle');
    
    if (displayElement && device) displayElement.textContent = device.name;
    if (subtitleElement && device) subtitleElement.textContent = `Live data from ${device.name} - ${device.location}`;
}

function updateTotalDevices() {
    const totalElement = document.getElementById('totalDevices');
    const onlineCount = devices.filter(d => d.status === 'online').length;
    const onlineElement = document.getElementById('onlineDevices');
    
    if (totalElement) totalElement.textContent = devices.length;
    if (onlineElement) onlineElement.textContent = onlineCount;
}

function renderDeviceList() {
    const container = document.getElementById('deviceList');
    if (!container) return;
    
    const searchTerm = document.getElementById('deviceSearch')?.value.toLowerCase() || '';
    const filteredDevices = devices.filter(d => d.name.toLowerCase().includes(searchTerm) || d.location.toLowerCase().includes(searchTerm));
    
    container.innerHTML = filteredDevices.map(device => `
        <div class="device-item ${activeDeviceId === device.id ? 'active' : ''} ${device.status === 'online' ? 'online' : 'offline'}" data-device-id="${device.id}">
            <div class="device-name">
                <span>${escapeHtml(device.name)}</span>
                <div class="device-actions">
                    <button class="device-action-btn edit-device" data-id="${device.id}">✏️</button>
                    <button class="device-action-btn delete-device" data-id="${device.id}">🗑️</button>
                </div>
            </div>
            <div class="device-location">📍 ${escapeHtml(device.location)}</div>
            <div class="device-status">
                <span><span class="status-indicator ${device.status === 'online' ? 'online' : 'offline'}"></span>${device.status === 'online' ? 'Online' : 'Offline'}</span>
                <span>${device.port || 'Auto'}</span>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.device-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (!e.target.classList.contains('device-action-btn')) {
                switchDevice(el.dataset.deviceId);
            }
        });
    });
    
    document.querySelectorAll('.edit-device').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            editDevice(btn.dataset.id);
        });
    });
    
    document.querySelectorAll('.delete-device').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this device?')) {
                deleteDevice(btn.dataset.id);
            }
        });
    });
    
    updateTotalDevices();
}

function editDevice(deviceId) {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Device';
    document.getElementById('deviceName').value = device.name;
    document.getElementById('deviceLocation').value = device.location;
    document.getElementById('devicePort').value = device.port || '';
    document.getElementById('deviceBaud').value = device.baud;
    document.getElementById('deviceDescription').value = device.description || '';
    
    currentEditingId = deviceId;
    document.getElementById('deviceModal').classList.add('show');
}

function clearCurrentData() {
    history.ph = [];
    history.turbidity = [];
    history.tds = [];
    history.temp = [];
    history.timestamp = [];
    
    if (mainChart) mainChart.update();
    Object.values(graphs).forEach(chart => { if (chart) chart.update(); });
}

function loadDeviceHistory(deviceId) {
    fetch(`${HISTORY_URL}?device=${deviceId}&n=100`)
        .then(res => res.json())
        .then(data => {
            if (data.readings && data.readings.length > 0) {
                data.readings.forEach(reading => {
                    history.ph.push(reading.ph);
                    history.turbidity.push(reading.turbidity);
                    history.tds.push(reading.tds);
                    history.temp.push(reading.temperature);
                    history.timestamp.push(new Date(reading.timestamp).toLocaleTimeString());
                });
                updateAllGraphs();
                updateGraphStats();
            }
        })
        .catch(err => console.error('Failed to load device history:', err));
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================
// PARTICLE SYSTEM
// =============================================

function initParticleSystem() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    
    let ctx = canvas.getContext('2d');
    let particles = [];
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.color = `rgba(0, ${150 + Math.random() * 105}, ${200 + Math.random() * 55}, ${0.3 + Math.random() * 0.3})`;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00d4ff';
        }
    }
    
    function initParticles() {
        particles = [];
        for (let i = 0; i < 100; i++) particles.push(new Particle());
    }
    
    function animateParticles() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.shadowBlur = 0;
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animateParticles);
    }
    
    window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });
    resizeCanvas();
    initParticles();
    animateParticles();
}

// =============================================
// WEBSOCKET
// =============================================

function initWebSocket() {
    try {
        if (typeof io === 'undefined') {
            console.warn('Socket.IO not loaded yet');
            return;
        }
        
        socket = io(WS_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });
        
        socket.on('connect', () => {
            console.log('[WebSocket] Connected');
            if (els.apiDot) els.apiDot.className = 'api-dot connected';
            if (els.apiMsg) els.apiMsg.textContent = '🔴 LIVE: Receiving real-time data';
            if (activeDeviceId) socket.emit('subscribe_device', activeDeviceId);
        });
        
        socket.on('new_sensor_data', (data) => {
            console.log('[WebSocket] New data:', `Temp=${data.temperature}°C, pH=${data.ph}`);
            if (!data.device_id || data.device_id === activeDeviceId) {
                updateDashboardUI(data);
                const device = devices.find(d => d.id === data.device_id);
                if (device && device.status !== 'online') {
                    updateDevice(device.id, { status: 'online', lastSeen: new Date().toISOString() });
                }
            }
        });
        
        socket.on('disconnect', () => {
            console.warn('[WebSocket] Disconnected');
            if (els.apiDot) els.apiDot.className = 'api-dot disconnected';
            if (els.apiMsg) els.apiMsg.textContent = '⚠️ WebSocket disconnected';
        });
    } catch (error) {
        console.warn('[WebSocket] Failed:', error);
    }
}

// =============================================
// FETCH DATA
// =============================================

async function fetchSensorData() {
    showSkeletons();
    try {
        const url = activeDeviceId ? `${API_URL}?device=${activeDeviceId}` : API_URL;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (data && data.temperature !== undefined && data.temperature !== "WAITING_FOR_DATA") {
            if (els.apiDot && (!socket || !socket.connected)) {
                els.apiDot.className = 'api-dot connected';
                els.apiMsg.textContent = '🔴 LIVE: Data via HTTP';
            }
            updateDashboardUI(data);
            
            const device = devices.find(d => d.id === activeDeviceId);
            if (device && device.status !== 'online') {
                updateDevice(device.id, { status: 'online', lastSeen: new Date().toISOString() });
            }
        }
        
        if (isFirstFetch && els.loadingOverlay) {
            setTimeout(() => { if (els.loadingOverlay) els.loadingOverlay.classList.add('hidden'); }, 1000);
            isFirstFetch = false;
        }
        hideSkeletons();
    } catch (error) {
        console.error('[HTTP] Error:', error);
        hideSkeletons();
        if (isFirstFetch && els.loadingOverlay) {
            els.loadingOverlay.classList.add('hidden');
            isFirstFetch = false;
        }
        if (els.apiDot) els.apiDot.className = 'api-dot disconnected';
        if (els.apiMsg) els.apiMsg.textContent = '⚠️ Waiting for data...';
        
        const device = devices.find(d => d.id === activeDeviceId);
        if (device && device.status !== 'offline') updateDevice(device.id, { status: 'offline' });
    }
}

// =============================================
// UI UPDATE FUNCTIONS
// =============================================

function animateValue(element, start, end, duration = 500) {
    if (!element) return;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = start + (end - start) * easeOutQuart;
        
        if (element.id === 'val-ph') element.textContent = current.toFixed(2);
        else if (element.id === 'val-turbidity') element.textContent = current.toFixed(2);
        else if (element.id === 'val-tds') element.textContent = current.toFixed(1);
        else if (element.id === 'val-temp') element.textContent = current.toFixed(1);
        
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function updateDashboardUI(data) {
    const oldData = {
        ph: parseFloat(els.valPh?.textContent) || data.ph,
        turbidity: parseFloat(els.valTurbidity?.textContent) || data.turbidity,
        tds: parseFloat(els.valTds?.textContent) || data.tds,
        temp: parseFloat(els.valTemp?.textContent) || data.temperature
    };
    
    if (els.valPh && oldData.ph !== data.ph) animateValue(els.valPh, oldData.ph, data.ph, 500);
    if (els.valTurbidity && oldData.turbidity !== data.turbidity) animateValue(els.valTurbidity, oldData.turbidity, data.turbidity, 500);
    if (els.valTds && oldData.tds !== data.tds) animateValue(els.valTds, oldData.tds, data.tds, 500);
    if (els.valTemp && oldData.temp !== data.temperature) animateValue(els.valTemp, oldData.temp, data.temperature, 500);
    
    updateBadge('ph', data.ph, els.badgePh);
    updateBadge('turbidity', data.turbidity, els.badgeTurbidity);
    updateBadge('tds', data.tds, els.badgeTds);
    updateBadge('temp', data.temperature, els.badgeTemp);
    
    updateWQI(data);
    updateWaterLevel(calculateWQI(data));
    updateStatusBanner(data);
    
    history.ph.push(data.ph);
    history.turbidity.push(data.turbidity);
    history.tds.push(data.tds);
    history.temp.push(data.temperature);
    history.timestamp.push(new Date().toLocaleTimeString());
    
    if (history.ph.length > 100) history.ph.shift();
    if (history.turbidity.length > 100) history.turbidity.shift();
    if (history.tds.length > 100) history.tds.shift();
    if (history.temp.length > 100) history.temp.shift();
    if (history.timestamp.length > 100) history.timestamp.shift();
    
    if (!originalHistoryData) storeOriginalHistory();
    
    updateAllGraphs();
    updateGraphStats();
    
    if (els.lastUpdate) els.lastUpdate.textContent = new Date().toLocaleTimeString();
}

function updateBadge(param, value, badgeElement) {
    if (!badgeElement) return;
    const status = evaluateStatus(param, value);
    badgeElement.className = `status-badge-small ${status}`;
    badgeElement.textContent = status.toUpperCase();
}

function evaluateStatus(parameter, value) {
    const thresholds = THRESHOLDS[parameter];
    if (!thresholds) return 'safe';
    
    if (parameter === 'ph') {
        if (value < thresholds.warnMin || value > thresholds.warnMax) return 'danger';
        if (value < thresholds.safeMin || value > thresholds.safeMax) return 'moderate';
        return 'safe';
    }
    if (parameter === 'temp') {
        if (value < thresholds.warnMin || value > thresholds.warnMax) return 'danger';
        if (value < thresholds.safeMin || value > thresholds.safeMax) return 'moderate';
        return 'safe';
    }
    if (value > thresholds.warnMax) return 'danger';
    if (value > thresholds.safeMax) return 'moderate';
    return 'safe';
}

function calculateWQI(data) {
    const phScore = (data.ph >= 6.5 && data.ph <= 8.5) ? 100 : Math.max(0, 100 - Math.abs(data.ph - 7) * 20);
    const turbidityScore = Math.max(0, 100 - (data.turbidity / 5) * 80);
    const tdsScore = data.tds <= 500 ? 100 : Math.max(0, 100 - (data.tds - 500) / 10);
    const tempScore = (data.temperature >= 10 && data.temperature <= 35) ? 100 : Math.max(0, 100 - Math.abs(data.temperature - 22.5) * 6);
    return Math.round((phScore + turbidityScore + tdsScore + tempScore) / 4);
}

function getWQICategory(score) {
    if (score >= 90) return { label: 'Excellent', color: '#00ff9d' };
    if (score >= 70) return { label: 'Good', color: '#00d4ff' };
    if (score >= 50) return { label: 'Moderate', color: '#ffd700' };
    if (score >= 25) return { label: 'Poor', color: '#ff6b35' };
    return { label: 'Very Poor', color: '#ff2d55' };
}

function updateWQI(data) {
    const wqi = calculateWQI(data);
    const category = getWQICategory(wqi);
    
    if (els.wqiNum) {
        els.wqiNum.textContent = wqi;
        els.wqiNum.style.color = category.color;
    }
    if (els.wqiLabel) els.wqiLabel.textContent = category.label;
    
    if (els.ringFill) {
        const circumference = 314;
        const offset = circumference - (wqi / 100) * circumference;
        els.ringFill.style.strokeDashoffset = offset;
        els.ringFill.style.stroke = category.color;
    }
    
    if (window.wqiGauge) window.wqiGauge.update(wqi);
}

function updateWaterLevel(wqi) {
    if (els.waterFill) els.waterFill.style.height = wqi + '%';
    if (els.waterQuality) els.waterQuality.textContent = wqi;
    if (els.healthScore) {
        const scores = ['Critical', 'Poor', 'Fair', 'Good', 'Excellent'];
        const index = Math.floor(wqi / 20);
        els.healthScore.textContent = scores[Math.min(index, 4)];
        els.healthScore.style.color = getWQICategory(wqi).color;
    }
}

function updateStatusBanner(data) {
    const statuses = [
        evaluateStatus('ph', data.ph),
        evaluateStatus('turbidity', data.turbidity),
        evaluateStatus('tds', data.tds),
        evaluateStatus('temp', data.temperature)
    ];
    
    if (els.statusBanner && els.statusIcon && els.statusText) {
        if (statuses.includes('danger')) {
            els.statusBanner.className = 'status-banner danger';
            els.statusIcon.textContent = '🚨';
            els.statusText.textContent = 'ALERT: Parameters exceed danger thresholds!';
        } else if (statuses.includes('moderate')) {
            els.statusBanner.className = 'status-banner moderate';
            els.statusIcon.textContent = '⚠️';
            els.statusText.textContent = 'Warning: Some parameters approaching unsafe levels.';
        } else {
            els.statusBanner.className = 'status-banner';
            els.statusIcon.textContent = '✅';
            els.statusText.textContent = 'All parameters within safe limits.';
        }
    }
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        const alertEl = document.createElement('div');
        alertEl.className = `alert alert-${type}`;
        alertEl.innerHTML = `<span class="alert-icon">${type === 'critical' ? '🚨' : type === 'warning' ? '⚠️' : 'ℹ️'}</span><span>${message}</span><button class="alert-close" onclick="this.parentElement.remove()">×</button>`;
        alertContainer.appendChild(alertEl);
        setTimeout(() => alertEl.remove(), 5000);
    }
}

// =============================================
// CHART THEME HELPERS
// Chart.js cannot resolve CSS variables on its own —
// these helpers read the actual computed values so tick
// and label colours always match the active theme.
// =============================================

function getChartTickColor() {
    return getComputedStyle(document.documentElement)
        .getPropertyValue('--text-secondary').trim();
}

function getChartLabelColor() {
    return getComputedStyle(document.documentElement)
        .getPropertyValue('--text-primary').trim();
}

function getGridColor() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
}

// Call this every time the theme changes — updates every live chart instance.
function updateAllChartColors() {
    const tick  = getChartTickColor();
    const label = getChartLabelColor();
    const grid  = getGridColor();

    // Individual parameter mini-graphs
    Object.values(graphs).forEach(chart => {
        if (!chart) return;
        chart.options.plugins.legend.labels.color          = label;
        chart.options.scales.x.ticks.color                 = tick;
        chart.options.scales.x.grid.color                  = grid;
        chart.options.scales.y.ticks.color                 = tick;
        chart.options.scales.y.grid.color                  = grid;
        chart.update('none'); // 'none' skips animation for instant feel
    });

    // Main combined graph
    if (mainChart) {
        mainChart.options.plugins.legend.labels.color = label;
        // x-axis
        mainChart.options.scales.x.ticks.color        = tick;
        mainChart.options.scales.x.title.color        = tick;
        // y-axes (keep their accent title colours, only update tick values)
        ['y', 'y1', 'y2', 'y3'].forEach(id => {
            if (mainChart.options.scales[id]) {
                mainChart.options.scales[id].ticks.color = tick;
            }
        });
        mainChart.update('none');
    }
}

// =============================================
// GRAPH FUNCTIONS
// =============================================

function initIndividualGraphs() {
    const graphColors = {
        ph: 'rgb(0,212,255)',
        turbidity: 'rgb(0,245,212)',
        tds: 'rgb(0,255,157)',
        temperature: 'rgb(255,200,50)'
    };
    
    for (const [param, color] of Object.entries(graphColors)) {
        const ctx = document.getElementById(`graph-${param}`);
        if (ctx) {
            graphs[param] = new Chart(ctx, {
                type: 'line',
                data: { labels: [], datasets: [{ label: param === 'temperature' ? 'Temperature (°C)' : param.charAt(0).toUpperCase() + param.slice(1), data: [], borderColor: color, borderWidth: 2, pointRadius: 2, pointBackgroundColor: color, fill: true, backgroundColor: color.replace('rgb', 'rgba').replace(')', ',0.1)'), tension: 0.3 }] },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: true, labels: { color: getChartLabelColor() } } },
                    scales: { x: { ticks: { color: getChartTickColor() }, grid: { color: getGridColor() } }, y: { ticks: { color: getChartTickColor() }, grid: { color: getGridColor() } } }
                }
            });
        }
    }
}

function initMainGraph() {
    const ctx = document.getElementById('mainGraph');
    if (!ctx) return;
    
    mainChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [
            { label: 'pH Level', data: [], borderColor: 'rgb(0,212,255)', backgroundColor: 'rgba(0,212,255,0.05)', borderWidth: 2, pointRadius: 1, tension: 0.3, yAxisID: 'y' },
            { label: 'Turbidity (NTU)', data: [], borderColor: 'rgb(0,245,212)', backgroundColor: 'rgba(0,245,212,0.05)', borderWidth: 2, pointRadius: 1, tension: 0.3, yAxisID: 'y1' },
            { label: 'TDS (ppm)', data: [], borderColor: 'rgb(0,255,157)', backgroundColor: 'rgba(0,255,157,0.05)', borderWidth: 2, pointRadius: 1, tension: 0.3, yAxisID: 'y2' },
            { label: 'Temperature (°C)', data: [], borderColor: 'rgb(255,200,50)', backgroundColor: 'rgba(255,200,50,0.05)', borderWidth: 2, pointRadius: 1, tension: 0.3, yAxisID: 'y3' }
        ] },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top', labels: { color: getChartLabelColor() } } },
            scales: {
                x: { title: { display: true, text: 'Time', color: getChartTickColor() }, ticks: { color: getChartTickColor() } },
                y: { title: { display: true, text: 'pH', color: 'rgb(0,212,255)' }, position: 'left', ticks: { color: getChartTickColor() } },
                y1: { title: { display: true, text: 'Turbidity (NTU)', color: 'rgb(0,245,212)' }, position: 'right', ticks: { color: getChartTickColor() }, grid: { drawOnChartArea: false } },
                y2: { title: { display: true, text: 'TDS (ppm)', color: 'rgb(0,255,157)' }, position: 'right', ticks: { color: getChartTickColor() }, grid: { drawOnChartArea: false } },
                y3: { title: { display: true, text: 'Temperature (°C)', color: 'rgb(255,200,50)' }, position: 'right', ticks: { color: getChartTickColor() }, grid: { drawOnChartArea: false } }
            }
        }
    });
}

function updateAllGraphs() {
    let points = currentTimeframe === 'all' ? history.timestamp.length : Math.min(currentTimeframe, history.timestamp.length);
    let labels = history.timestamp.slice(-points);
    let phData = history.ph.slice(-points);
    let turbidityData = history.turbidity.slice(-points);
    let tdsData = history.tds.slice(-points);
    let tempData = history.temp.slice(-points);
    
    if (graphs.ph) { graphs.ph.data.labels = labels; graphs.ph.data.datasets[0].data = phData; graphs.ph.update(); }
    if (graphs.turbidity) { graphs.turbidity.data.labels = labels; graphs.turbidity.data.datasets[0].data = turbidityData; graphs.turbidity.update(); }
    if (graphs.tds) { graphs.tds.data.labels = labels; graphs.tds.data.datasets[0].data = tdsData; graphs.tds.update(); }
    if (graphs.temperature) { graphs.temperature.data.labels = labels; graphs.temperature.data.datasets[0].data = tempData; graphs.temperature.update(); }
    
    if (mainChart) {
        if (currentGraphParam === 'all') {
            mainChart.data.datasets.forEach(ds => ds.hidden = false);
            mainChart.data.labels = labels;
            mainChart.data.datasets[0].data = phData;
            mainChart.data.datasets[1].data = turbidityData;
            mainChart.data.datasets[2].data = tdsData;
            mainChart.data.datasets[3].data = tempData;
        } else if (currentGraphParam === 'ph') {
            mainChart.data.datasets.forEach((ds, idx) => ds.hidden = idx !== 0);
            mainChart.data.labels = labels;
            mainChart.data.datasets[0].data = phData;
        } else if (currentGraphParam === 'turbidity') {
            mainChart.data.datasets.forEach((ds, idx) => ds.hidden = idx !== 1);
            mainChart.data.labels = labels;
            mainChart.data.datasets[1].data = turbidityData;
        } else if (currentGraphParam === 'tds') {
            mainChart.data.datasets.forEach((ds, idx) => ds.hidden = idx !== 2);
            mainChart.data.labels = labels;
            mainChart.data.datasets[2].data = tdsData;
        } else if (currentGraphParam === 'temperature') {
            mainChart.data.datasets.forEach((ds, idx) => ds.hidden = idx !== 3);
            mainChart.data.labels = labels;
            mainChart.data.datasets[3].data = tempData;
        }
        mainChart.update();
    }
}

function updateGraphStats() {
    if (history.ph.length > 0) {
        const phMin = document.getElementById('ph-min');
        const phMax = document.getElementById('ph-max');
        const phAvg = document.getElementById('ph-avg');
        if (phMin) phMin.textContent = Math.min(...history.ph).toFixed(2);
        if (phMax) phMax.textContent = Math.max(...history.ph).toFixed(2);
        if (phAvg) phAvg.textContent = (history.ph.reduce((a,b) => a+b,0) / history.ph.length).toFixed(2);
        
        const turbMin = document.getElementById('turbidity-min');
        const turbMax = document.getElementById('turbidity-max');
        const turbAvg = document.getElementById('turbidity-avg');
        if (turbMin) turbMin.textContent = Math.min(...history.turbidity).toFixed(2);
        if (turbMax) turbMax.textContent = Math.max(...history.turbidity).toFixed(2);
        if (turbAvg) turbAvg.textContent = (history.turbidity.reduce((a,b) => a+b,0) / history.turbidity.length).toFixed(2);
        
        const tdsMin = document.getElementById('tds-min');
        const tdsMax = document.getElementById('tds-max');
        const tdsAvg = document.getElementById('tds-avg');
        if (tdsMin) tdsMin.textContent = Math.min(...history.tds).toFixed(1);
        if (tdsMax) tdsMax.textContent = Math.max(...history.tds).toFixed(1);
        if (tdsAvg) tdsAvg.textContent = (history.tds.reduce((a,b) => a+b,0) / history.tds.length).toFixed(1);
        
        const tempMin = document.getElementById('temp-min');
        const tempMax = document.getElementById('temp-max');
        const tempAvg = document.getElementById('temp-avg');
        if (tempMin) tempMin.textContent = Math.min(...history.temp).toFixed(1);
        if (tempMax) tempMax.textContent = Math.max(...history.temp).toFixed(1);
        if (tempAvg) tempAvg.textContent = (history.temp.reduce((a,b) => a+b,0) / history.temp.length).toFixed(1);
    }
}

function setupGraphControls() {
    document.querySelectorAll('.graph-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.graph-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGraphParam = btn.dataset.graph;
            updateAllGraphs();
        });
    });
    
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTimeframe = btn.dataset.time === 'all' ? 'all' : parseInt(btn.dataset.time);
            updateAllGraphs();
        });
    });
}

// =============================================
// MODAL HANDLERS
// =============================================

async function loadSerialPorts() {
    try {
        const response = await fetch(PORTS_URL);
        const data = await response.json();
        const portSelect = document.getElementById('devicePort');
        if (portSelect && data.ports) {
            portSelect.innerHTML = '<option value="">Auto-detect</option>' + data.ports.map(port => `<option value="${port.device}">${port.device} - ${port.description}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load ports:', error);
    }
}

function initDeviceModal() {
    const modal = document.getElementById('deviceModal');
    const addBtn = document.getElementById('addDeviceBtn');
    const scanBtn = document.getElementById('scanDevicesBtn');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelModal');
    const saveBtn = document.getElementById('saveDevice');
    const showDevicesBtn = document.getElementById('showDevicesBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            currentEditingId = null;
            document.getElementById('modalTitle').textContent = 'Add New Device';
            document.getElementById('deviceName').value = '';
            document.getElementById('deviceLocation').value = '';
            document.getElementById('devicePort').value = '';
            document.getElementById('deviceBaud').value = '9600';
            document.getElementById('deviceDescription').value = '';
            loadSerialPorts();
            modal.classList.add('show');
        });
    }
    
    if (scanBtn) scanBtn.addEventListener('click', loadSerialPorts);
    
    if (showDevicesBtn) {
        showDevicesBtn.addEventListener('click', () => {
            if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                if (sidebarToggle) sidebarToggle.textContent = '◀';
            }
        });
    }
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            sidebarToggle.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
        });
    }
    
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.remove('show'));
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const deviceData = {
                name: document.getElementById('deviceName').value,
                location: document.getElementById('deviceLocation').value,
                port: document.getElementById('devicePort').value,
                baud: parseInt(document.getElementById('deviceBaud').value),
                description: document.getElementById('deviceDescription').value
            };
            
            if (!deviceData.name) {
                alert('Please enter a device name');
                return;
            }
            
            if (currentEditingId) {
                updateDevice(currentEditingId, deviceData);
                showAlert(`Device "${deviceData.name}" updated`, 'info');
            } else {
                addDevice(deviceData);
                showAlert(`Device "${deviceData.name}" added`, 'info');
            }
            modal.classList.remove('show');
        });
    }
}

// =============================================
// CLOCK, FULLSCREEN, THEME, KEYBOARD
// =============================================

function updateClock() {
    const clock = document.getElementById('liveClock');
    if (clock) {
        clock.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}

function initFullscreen() {
    const btn = document.createElement('button');
    btn.innerHTML = '🔲';
    btn.className = 'fullscreen-btn';
    btn.onclick = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            btn.innerHTML = '✖️';
        } else {
            document.exitFullscreen();
            btn.innerHTML = '🔲';
        }
    };
    const navActions = document.querySelector('.nav-actions');
    if (navActions) navActions.appendChild(btn);
}

function initThemePersistence() {
    const savedTheme = localStorage.getItem('aqua-theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
    
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('aqua-theme', newTheme);
            const themeIcon = document.querySelector('.theme-icon');
            if (themeIcon) themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            if (mainChart) mainChart.update();
            Object.values(graphs).forEach(chart => { if (chart) chart.update(); });
            updateAllChartColors();
        });
    }
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        switch(e.key.toLowerCase()) {
            case 'f':
                if (!document.fullscreenElement) document.documentElement.requestFullscreen();
                else document.exitFullscreen();
                break;
            case 'd': document.getElementById('themeToggle')?.click(); break;
            case 'r': fetchSensorData(); break;
            case 'm':
                const sidebar = document.getElementById('sidebar');
                const toggle = document.getElementById('sidebarToggle');
                if (sidebar) {
                    sidebar.classList.toggle('collapsed');
                    if (toggle) toggle.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
                }
                break;
        }
    });
}

function initScrollReveal() {
    const revealElements = document.querySelectorAll('.compact-card, .about-card, .wqi-panel, .indiv-graph-card, .water-level-panel');
    revealElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = `opacity 0.6s ${index * 0.08}s ease, transform 0.6s ${index * 0.08}s ease`;
    });
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.15 });
    revealElements.forEach(element => revealObserver.observe(element));
}

function initStatCounters() {
    const heroObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            const statSensors = document.getElementById('statSensors');
            const statLocations = document.getElementById('statLocations');
            if (statSensors) animateCounter(statSensors, 24, '');
            if (statLocations) animateCounter(statLocations, 6, '');
            heroObserver.disconnect();
        }
    }, { threshold: 0.5 });
    const heroSection = document.getElementById('hero');
    if (heroSection) heroObserver.observe(heroSection);
}

function animateCounter(element, targetValue, suffix = '', duration = 1200) {
    if (!element) return;
    const startTime = Date.now();
    const endValue = parseFloat(targetValue);
    function updateCounter() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(endValue * easedProgress);
        element.textContent = currentValue + suffix;
        if (progress < 1) requestAnimationFrame(updateCounter);
        else element.textContent = targetValue + suffix;
    }
    requestAnimationFrame(updateCounter);
}

function initMobileSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!menuToggle || !sidebar) return;
    
    function openSidebar() {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeSidebar() {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    menuToggle.addEventListener('click', openSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
    });
    
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeSidebar();
    });
}

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Aqua Sense Dashboard Starting...');
    
    initParticleSystem();
    initThemePersistence();
    initIndividualGraphs();
    initMainGraph();
    setupGraphControls();
    initScrollReveal();
    initStatCounters();
    initFullscreen();
    initKeyboardShortcuts();
    initDeviceModal();
    initMobileSidebar();
    initExportButton();
    initDateRangePicker();
    
    loadDevices();
    
    updateClock();
    setInterval(updateClock, 1000);
    
    if (typeof io !== 'undefined') {
        initWebSocket();
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
        script.onload = () => initWebSocket();
        document.head.appendChild(script);
    }
    
    fetchSensorData();
    setInterval(fetchSensorData, REFRESH_MS);
    
    setTimeout(() => {
        if (document.getElementById('wqiGaugeCanvas')) {
            window.wqiGauge = new AnimatedGauge('wqiGaugeCanvas', 180);
            if (els.wqiNum && els.wqiNum.textContent !== '—') {
                const initialWQI = parseInt(els.wqiNum.textContent);
                if (!isNaN(initialWQI)) window.wqiGauge.update(initialWQI);
            }
        }
    }, 500);
    
    setTimeout(() => {
        window.dataComparison = new DataComparison();
    }, 1000);
    
    console.log('✅ Dashboard Ready');
});

window.addEventListener('beforeunload', () => {
    if (mainChart) mainChart.destroy();
    Object.values(graphs).forEach(chart => { if (chart) chart.destroy(); });
    if (socket) socket.disconnect();
});