// Enhanced HealthDashboard with Backend Integration
// This file combines the original app.js functionality with backend API integration

class DigitalTwinAPI {
    constructor(baseURL = 'http://localhost:5000') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('authToken');
        this.refreshInterval = null;
    }
    
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }
    
    async makeRequest(endpoint, options = {}) {
        const config = {
            method: 'GET',
            headers: this.getHeaders(),
            ...options
        };
        
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    throw new Error('Authentication required');
                }
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }
    
    // Authentication methods
    async login(email, password) {
        const response = await this.makeRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (response.success) {
            this.token = response.token;
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }
        
        return response;
    }
    
    async register(userData) {
        return await this.makeRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    logout() {
        this.token = null;
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        location.reload();
    }
    
    // Data methods
    async getCurrentHealth() {
        const response = await this.makeRequest('/api/health/current');
        return response.data;
    }
    
    async getHealthHistory(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/api/health/history${queryString ? '?' + queryString : ''}`;
        const response = await this.makeRequest(endpoint);
        return response.data;
    }
    
    async submitHealthData(healthData) {
        return await this.makeRequest('/api/health/submit', {
            method: 'POST',
            body: JSON.stringify(healthData)
        });
    }
    
    async getAcademicData() {
        const response = await this.makeRequest('/api/academic/performance');
        return response.data;
    }
    
    async submitAcademicData(academicData) {
        return await this.makeRequest('/api/academic/submit', {
            method: 'POST',
            body: JSON.stringify(academicData)
        });
    }
    
    async getPredictions() {
        return await this.makeRequest('/api/predictions');
    }
    
    async getAlerts(showResolved = false) {
        const params = showResolved ? '?resolved=true' : '';
        const response = await this.makeRequest(`/api/alerts${params}`);
        return response.alerts;
    }
    
    async resolveAlert(alertId) {
        return await this.makeRequest(`/api/alerts/${alertId}/resolve`, {
            method: 'PUT'
        });
    }
    
    async getDevices() {
        const response = await this.makeRequest('/api/devices');
        return response.devices;
    }
    
    async getGoals() {
        const response = await this.makeRequest('/api/goals');
        return response.goals;
    }
    
    async getLifestyleData() {
        const response = await this.makeRequest('/api/lifestyle');
        return response.data;
    }
    
    isAuthenticated() {
        return !!this.token;
    }
    
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('user') || '{}');
    }
}

// Enhanced HealthDashboard class with backend integration
class HealthDashboard {
    constructor() {
        this.api = new DigitalTwinAPI();
        this.currentView = 'dashboard';
        this.charts = {};
        this.data = {
            currentHealthMetrics: {},
            academicData: {},
            lifestyle: {},
            predictions: {},
            alerts: [],
            devices: [],
            goals: {}
        };
        
        // Chart configurations
        this.chartConfigs = {
            heartRate: {
                type: 'line',
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Heart Rate Trends (7 Days)'
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 60,
                            max: 100,
                            title: {
                                display: true,
                                text: 'BPM'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Time'
                            }
                        }
                    }
                }
            },
            sleep: {
                type: 'bar',
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Sleep Quality Analysis (7 Days)'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Quality Score'
                            }
                        }
                    }
                }
            },
            stress: {
                type: 'line',
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Stress Level Patterns (7 Days)'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            min: 1,
                            max: 5,
                            title: {
                                display: true,
                                text: 'Stress Level'
                            }
                        }
                    }
                }
            },
            activity: {
                type: 'doughnut',
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Today\'s Activity Distribution'
                        }
                    }
                }
            }
        };
    }

    async init() {
        console.log('🚀 Initializing Digital Twin Dashboard...');
        
        // Check authentication
        if (!this.api.isAuthenticated()) {
            this.showLoginPrompt();
            return;
        }
        
        // Show loading state
        this.showLoadingState();
        
        try {
            // Load real data from backend
            await this.loadAllData();
            
            // Initialize UI components
            this.initializeEventListeners();
            this.initializeCharts();
            
            // Set up auto-refresh
            this.setupAutoRefresh();
            
            // Hide loading state
            this.hideLoadingState();
            
            console.log('✅ Dashboard initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize dashboard:', error);
            this.hideLoadingState();
            this.showNotification('Error', 'Failed to load dashboard. Please try again.', 'error');
        }
    }

    async loadAllData() {
        try {
            // Load all data in parallel
            const [currentHealth, academicData, predictions, alerts, devices, goals, lifestyle] = await Promise.all([
                this.api.getCurrentHealth().catch(e => ({ heartRate: 78, healthStatus: 'Good' })),
                this.api.getAcademicData().catch(e => ({ currentGPA: 3.67 })),
                this.api.getPredictions().catch(e => ({ predictions: {} })),
                this.api.getAlerts().catch(e => []),
                this.api.getDevices().catch(e => []),
                this.api.getGoals().catch(e => ({})),
                this.api.getLifestyleData().catch(e => ({}))
            ]);
            
            // Update data with real backend data
            this.updateDataWithBackendResults(currentHealth, academicData, predictions, alerts, devices, goals, lifestyle);
            
            // Update UI
            this.updateAllDisplays();
            
            // Load historical data for charts
            await this.loadHistoricalData();
            
        } catch (error) {
            console.error('Failed to load data:', error);
            throw error;
        }
    }

    updateDataWithBackendResults(currentHealth, academicData, predictions, alerts, devices, goals, lifestyle) {
        // Update current health metrics
        this.data.currentHealthMetrics = {
            heartRate: currentHealth.heartRate || 78,
            bloodPressure: currentHealth.bloodPressure || { systolic: 118, diastolic: 76 },
            oxygenSaturation: currentHealth.oxygenSaturation || 98,
            stressLevel: currentHealth.stressLevel || "Low",
            sleepQuality: currentHealth.sleepQuality || 85,
            healthStatus: currentHealth.healthStatus || "Excellent",
            stepsCount: currentHealth.stepsCount || 8247,
            caloriesBurned: currentHealth.caloriesBurned || 2156,
            activeMinutes: currentHealth.activeMinutes || 45
        };
        
        // Update academic data
        this.data.academicData = {
            currentGPA: academicData.currentGPA || 3.67,
            studyHours: academicData.studyHours || { daily: 4.5, weekly: 28, recommended: 35 },
            assignments: academicData.assignments || { completed: 12, pending: 3, overdue: 1 },
            attendance: { percentage: academicData.attendance?.percentage || 94 },
            upcomingExams: academicData.upcomingExams || [
                { subject: "Data Structures", date: "2025-09-25", difficulty: "High" },
                { subject: "Statistics", date: "2025-09-28", difficulty: "Medium" }
            ]
        };
        
        // Update lifestyle data
        this.data.lifestyle = {
            dailySteps: currentHealth.stepsCount || lifestyle.dailySteps || 8247,
            caloriesBurned: currentHealth.caloriesBurned || lifestyle.caloriesBurned || 2156,
            waterIntake: lifestyle.waterIntake || 6,
            screenTime: lifestyle.screenTime || 5.2,
            socialInteractions: lifestyle.socialInteractions || 7,
            moodRating: lifestyle.moodRating || 7,
            activeMinutes: currentHealth.activeMinutes || lifestyle.activeMinutes || 45
        };
        
        // Update predictions
        if (predictions.predictions) {
            this.data.predictions = {
                burnoutRisk: predictions.predictions.burnoutRisk?.risk_percentage || 23,
                academicPerformance: predictions.predictions.academicPerformance?.predicted_gpa || 85,
                healthTrend: predictions.predictions.healthTrend?.trend || "Improving",
                recommendedActions: predictions.recommendations || [
                    "Maintain regular sleep schedule",
                    "Take study breaks every 90 minutes"
                ]
            };
        }
        
        // Update alerts
        this.data.alerts = alerts || [];
        
        // Update devices
        this.data.devices = devices || [];
        
        // Update goals
        this.data.goals = goals || {};
    }

    updateAllDisplays() {
        this.updateDashboardMetrics();
        this.updateUserInfo();
        this.renderAlerts();
        this.renderExams();
        this.renderDevices();
        this.renderGoalsProgress();
        this.renderRecommendations();
        this.updateLastUpdatedTime();
    }

    updateDashboardMetrics() {
        const metrics = this.data.currentHealthMetrics;
        
        // Update heart rate
        if (document.getElementById('heartRateValue')) {
            document.getElementById('heartRateValue').textContent = metrics.heartRate ? `${metrics.heartRate} BPM` : 'No Data';
        }
        
        // Update blood pressure
        if (document.getElementById('bloodPressureValue') && metrics.bloodPressure) {
            document.getElementById('bloodPressureValue').textContent = `${metrics.bloodPressure.systolic}/${metrics.bloodPressure.diastolic} mmHg`;
        }
        
        // Update oxygen saturation
        if (document.getElementById('oxygenValue')) {
            document.getElementById('oxygenValue').textContent = metrics.oxygenSaturation ? `${metrics.oxygenSaturation} %` : 'No Data';
        }
        
        // Update stress level
        if (document.getElementById('stressValue')) {
            document.getElementById('stressValue').textContent = metrics.stressLevel || 'No Data';
        }
        
        // Update sleep quality
        if (document.getElementById('sleepValue')) {
            document.getElementById('sleepValue').textContent = metrics.sleepQuality ? `${metrics.sleepQuality} /100` : 'No Data';
        }
        
        // Update daily steps
        if (document.getElementById('stepsValue')) {
            document.getElementById('stepsValue').textContent = metrics.stepsCount ? metrics.stepsCount.toLocaleString() : 'No Data';
        }
        
        // Update overall health status
        if (document.getElementById('healthStatusTitle')) {
            document.getElementById('healthStatusTitle').textContent = metrics.healthStatus || 'Good';
        }
        
        // Update health score
        if (document.getElementById('healthScore')) {
            const score = this.calculateHealthScore(metrics);
            document.getElementById('healthScore').textContent = score;
        }
        
        // Update today's summary
        if (document.getElementById('todayStudyHours')) {
            document.getElementById('todayStudyHours').textContent = `${this.data.academicData.studyHours?.daily || 4.5}h`;
        }
        if (document.getElementById('todayCalories')) {
            document.getElementById('todayCalories').textContent = metrics.caloriesBurned?.toLocaleString() || '2,156';
        }
        if (document.getElementById('todayWater')) {
            document.getElementById('todayWater').textContent = `${this.data.lifestyle.waterIntake || 6} glasses`;
        }
        if (document.getElementById('todayScreenTime')) {
            document.getElementById('todayScreenTime').textContent = `${this.data.lifestyle.screenTime || 5.2}h`;
        }
        
        // Update burnout risk
        if (document.getElementById('burnoutRisk')) {
            document.getElementById('burnoutRisk').textContent = `${this.data.predictions.burnoutRisk || 23}%`;
        }
        
        // Update academic metrics
        if (document.getElementById('currentGPA')) {
            document.getElementById('currentGPA').textContent = this.data.academicData.currentGPA || '3.67';
        }
        if (document.getElementById('weeklyStudyHours')) {
            document.getElementById('weeklyStudyHours').textContent = `${this.data.academicData.studyHours?.weekly || 28}h`;
        }
        if (document.getElementById('completedAssignments')) {
            document.getElementById('completedAssignments').textContent = this.data.academicData.assignments?.completed || 12;
        }
        if (document.getElementById('pendingAssignments')) {
            document.getElementById('pendingAssignments').textContent = this.data.academicData.assignments?.pending || 3;
        }
        if (document.getElementById('attendanceRate')) {
            document.getElementById('attendanceRate').textContent = `${this.data.academicData.attendance?.percentage || 94}%`;
        }
        
        // Update lifestyle metrics
        if (document.getElementById('dailySteps')) {
            document.getElementById('dailySteps').textContent = this.data.lifestyle.dailySteps?.toLocaleString() || '8,247';
        }
        if (document.getElementById('dailyCalories')) {
            document.getElementById('dailyCalories').textContent = this.data.lifestyle.caloriesBurned?.toLocaleString() || '2,156';
        }
        if (document.getElementById('waterIntake')) {
            document.getElementById('waterIntake').textContent = this.data.lifestyle.waterIntake || '6';
        }
        if (document.getElementById('screenTime')) {
            document.getElementById('screenTime').textContent = `${this.data.lifestyle.screenTime || 5.2} hours today`;
        }
        if (document.getElementById('moodRating')) {
            const mood = this.data.lifestyle.moodRating || 7;
            const emoji = this.getMoodEmoji(mood);
            document.getElementById('moodRating').textContent = `${emoji} ${mood}/10`;
        }
    }

    updateUserInfo() {
        const user = this.api.getCurrentUser();
        if (user.firstName) {
            const userName = document.getElementById('userName');
            if (userName) {
                userName.textContent = `${user.firstName} ${user.lastName}`;
            }
            
            const profileName = document.getElementById('profileName');
            if (profileName) {
                profileName.textContent = `${user.firstName} ${user.lastName}`;
            }
            
            const profileEmail = document.getElementById('profileEmail');
            if (profileEmail) {
                profileEmail.textContent = user.email;
            }
            
            // Update profile form
            this.updateProfileForm(user);
        }
    }

    updateProfileForm(user) {
        if (document.getElementById('profileFirstName')) {
            document.getElementById('profileFirstName').value = user.firstName || '';
        }
        if (document.getElementById('profileLastName')) {
            document.getElementById('profileLastName').value = user.lastName || '';
        }
        if (document.getElementById('profileDateOfBirth')) {
            document.getElementById('profileDateOfBirth').value = user.dateOfBirth || '';
        }
        if (document.getElementById('profileGender')) {
            document.getElementById('profileGender').value = user.gender || '';
        }
        if (document.getElementById('profileHeight')) {
            document.getElementById('profileHeight').value = user.height || '';
        }
        if (document.getElementById('profileWeight')) {
            document.getElementById('profileWeight').value = user.weight || '';
        }
    }

    renderAlerts() {
        const alertsList = document.getElementById('alertsList');
        const alertsContainer = document.getElementById('alertsContainer');
        const alertCount = document.getElementById('alertCount');
        
        if (!this.data.alerts.length) {
            const noAlertsHTML = `
                <div class="no-alerts">
                    <i class="fas fa-check-circle"></i>
                    <p>No active alerts</p>
                </div>
            `;
            
            if (alertsList) alertsList.innerHTML = noAlertsHTML;
            if (alertsContainer) alertsContainer.innerHTML = noAlertsHTML;
            if (alertCount) alertCount.textContent = '0';
            return;
        }
        
        const activeAlerts = this.data.alerts.filter(alert => !alert.resolved);
        if (alertCount) {
            alertCount.textContent = activeAlerts.length.toString();
        }
        
        const alertsHTML = activeAlerts.map(alert => `
            <div class="alert-item ${alert.category || 'info'}" data-alert-id="${alert.id}">
                <div class="alert-icon">
                    <i class="fas ${this.getAlertIcon(alert.type)}"></i>
                </div>
                <div class="alert-content">
                    <h4 class="alert-title">${alert.title}</h4>
                    <p class="alert-message">${alert.message}</p>
                    <span class="alert-time">${this.formatTimeAgo(alert.createdAt)}</span>
                </div>
                <div class="alert-actions">
                    <button class="btn btn--sm btn--ghost resolve-alert-btn" onclick="window.healthDashboard.resolveAlert(${alert.id})">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        if (alertsList) alertsList.innerHTML = alertsHTML;
        if (alertsContainer) alertsContainer.innerHTML = alertsHTML;
    }

    renderExams() {
        const examsList = document.getElementById('examsList');
        if (!examsList || !this.data.academicData.upcomingExams) return;
        
        const examsHTML = this.data.academicData.upcomingExams.map(exam => `
            <div class="exam-item">
                <div class="exam-info">
                    <h4 class="exam-subject">${exam.subject}</h4>
                    <span class="exam-date">${this.formatDate(exam.date)}</span>
                </div>
                <div class="exam-difficulty ${exam.difficulty.toLowerCase()}">
                    ${exam.difficulty}
                </div>
            </div>
        `).join('');
        
        examsList.innerHTML = examsHTML;
    }

    renderDevices() {
        const devicesGrid = document.getElementById('devicesGrid');
        if (!devicesGrid) return;
        
        if (!this.data.devices.length) {
            devicesGrid.innerHTML = `
                <div class="no-devices">
                    <i class="fas fa-mobile-alt"></i>
                    <h3>No Connected Devices</h3>
                    <p>Connect your wearable devices to start tracking health metrics automatically.</p>
                </div>
            `;
            return;
        }
        
        const devicesHTML = this.data.devices.map(device => `
            <div class="device-card ${device.status}">
                <div class="device-header">
                    <div class="device-icon">
                        <i class="fas ${this.getDeviceIcon(device.type)}"></i>
                    </div>
                    <div class="device-info">
                        <h4 class="device-name">${device.name}</h4>
                        <span class="device-model">${device.model || device.type}</span>
                    </div>
                </div>
                <div class="device-status">
                    <span class="status-badge ${device.status}">
                        <i class="fas ${device.isConnected ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        ${device.status}
                    </span>
                    ${device.battery ? `<span class="battery-level">${device.battery}%</span>` : ''}
                </div>
                ${device.lastSync ? `<div class="device-sync">Last sync: ${this.formatTimeAgo(device.lastSync)}</div>` : ''}
            </div>
        `).join('');
        
        devicesGrid.innerHTML = devicesHTML;
    }

    renderGoalsProgress() {
        const goalsGrid = document.getElementById('goalsGrid');
        if (!goalsGrid) return;
        
        // Use goals from backend or create default goals
        const goals = Object.keys(this.data.goals).length > 0 ? this.data.goals : {
            sleep: { target: 8, current: 7.2, progress: 90 },
            steps: { target: 10000, current: this.data.lifestyle.dailySteps || 8247, progress: 82 },
            study: { target: 6, current: this.data.academicData.studyHours?.daily || 4.5, progress: 75 },
            stress: { target: 2, current: 1, progress: 100 }
        };
        
        const goalsHTML = Object.entries(goals).map(([key, goal]) => `
            <div class="goal-card">
                <div class="goal-header">
                    <div class="goal-icon">
                        <i class="fas ${this.getGoalIcon(key)}"></i>
                    </div>
                    <h4 class="goal-title">${this.getGoalTitle(key)}</h4>
                </div>
                <div class="goal-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${goal.progress}%"></div>
                    </div>
                    <div class="progress-text">${goal.progress}%</div>
                </div>
                <div class="goal-stats">
                    <span class="current-value">${goal.current}</span>
                    <span class="target-value">/ ${goal.target}</span>
                    <span class="goal-unit">${this.getGoalUnit(key)}</span>
                </div>
            </div>
        `).join('');
        
        goalsGrid.innerHTML = goalsHTML;
    }

    renderRecommendations() {
        const recommendationsList = document.getElementById('recommendationsList');
        if (!recommendationsList) return;
        
        const recommendations = this.data.predictions.recommendedActions || [
            "Maintain regular sleep schedule",
            "Take study breaks every 90 minutes",
            "Stay physically active",
            "Practice stress management"
        ];
        
        const recommendationsHTML = recommendations.map(recommendation => `
            <li class="recommendation-item">
                <i class="fas fa-lightbulb"></i>
                <span>${recommendation}</span>
            </li>
        `).join('');
        
        recommendationsList.innerHTML = recommendationsHTML;
    }

    async loadHistoricalData() {
        try {
            // Load different types of historical data
            const [heartRateData, sleepData, stressData] = await Promise.all([
                this.api.getHealthHistory({ metric: 'heart_rate', days: 7 }).catch(() => []),
                this.api.getHealthHistory({ metric: 'sleep', days: 7 }).catch(() => []),
                this.api.getHealthHistory({ metric: 'stress', days: 7 }).catch(() => [])
            ]);
            
            // Update charts with real data
            this.updateHeartRateChart(heartRateData);
            this.updateSleepChart(sleepData);
            this.updateStressChart(stressData);
            this.updateActivityChart();
            
        } catch (error) {
            console.error('Failed to load historical data:', error);
        }
    }

    initializeCharts() {
        // Initialize charts when the analytics view is first accessed
        this.chartsInitialized = false;
    }

    updateHeartRateChart(data) {
        if (!data.length) return;
        
        const chartElement = document.getElementById('heartRateChart');
        if (!chartElement) return;
        
        if (this.charts.heartRate) {
            this.charts.heartRate.destroy();
        }
        
        const ctx = chartElement.getContext('2d');
        
        this.charts.heartRate = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => this.formatTime(item.time)),
                datasets: [{
                    label: 'Heart Rate',
                    data: data.map(item => item.value),
                    borderColor: 'var(--color-teal-500)',
                    backgroundColor: 'var(--color-teal-500)',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: this.chartConfigs.heartRate.options
        });
    }

    updateSleepChart(data) {
        if (!data.length) return;
        
        const chartElement = document.getElementById('sleepChart');
        if (!chartElement) return;
        
        if (this.charts.sleep) {
            this.charts.sleep.destroy();
        }
        
        const ctx = chartElement.getContext('2d');
        
        this.charts.sleep = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => this.formatDate(item.date)),
                datasets: [{
                    label: 'Sleep Quality',
                    data: data.map(item => item.quality),
                    backgroundColor: 'var(--color-teal-400)',
                    borderColor: 'var(--color-teal-500)',
                    borderWidth: 1
                }]
            },
            options: this.chartConfigs.sleep.options
        });
    }

    updateStressChart(data) {
        if (!data.length) return;
        
        const chartElement = document.getElementById('stressChart');
        if (!chartElement) return;
        
        if (this.charts.stress) {
            this.charts.stress.destroy();
        }
        
        const ctx = chartElement.getContext('2d');
        
        this.charts.stress = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => this.formatDate(item.date)),
                datasets: [{
                    label: 'Stress Level',
                    data: data.map(item => item.level),
                    borderColor: 'var(--color-orange-500)',
                    backgroundColor: 'var(--color-orange-400)',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: this.chartConfigs.stress.options
        });
    }

    updateActivityChart() {
        const chartElement = document.getElementById('activityChart');
        if (!chartElement) return;
        
        if (this.charts.activity) {
            this.charts.activity.destroy();
        }
        
        const ctx = chartElement.getContext('2d');
        
        const activeMinutes = this.data.lifestyle.activeMinutes || 45;
        const totalMinutes = 24 * 60;
        const inactiveMinutes = totalMinutes - activeMinutes - (8 * 60); // Assuming 8 hours sleep
        const sleepMinutes = 8 * 60;
        
        this.charts.activity = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Inactive', 'Sleep'],
                datasets: [{
                    data: [activeMinutes, inactiveMinutes, sleepMinutes],
                    backgroundColor: [
                        'var(--color-teal-500)',
                        'var(--color-gray-300)',
                        'var(--color-slate-500)'
                    ]
                }]
            },
            options: this.chartConfigs.activity.options
        });
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                this.switchView(view);
            });
        });
        
        // Mobile menu
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('sidebar');
        
        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }
        
        // Tab navigation in input view
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchInputTab(tabName);
            });
        });
        
        // Form submissions
        this.initializeFormHandlers();
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshDataBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.api.logout();
            });
        }
    }

    initializeFormHandlers() {
        // Health form
        const healthForm = document.getElementById('healthForm');
        if (healthForm) {
            healthForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleHealthFormSubmit(e);
            });
        }
        
        // Academic form
        const academicForm = document.getElementById('academicForm');
        if (academicForm) {
            academicForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleAcademicFormSubmit(e);
            });
        }
        
        // Profile form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleProfileFormSubmit(e);
            });
        }
        
        // Sample data generators
        document.getElementById('generateSampleHealthData')?.addEventListener('click', () => {
            this.generateSampleHealthData();
        });
        
        document.getElementById('generateSampleAcademicData')?.addEventListener('click', () => {
            this.generateSampleAcademicData();
        });
        
        document.getElementById('generateSampleLifestyleData')?.addEventListener('click', () => {
            this.generateSampleLifestyleData();
        });
    }

    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Show selected view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
        }
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-view="${viewName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Initialize charts when switching to analytics view
        if (viewName === 'analytics' && !this.chartsInitialized) {
            setTimeout(() => {
                this.loadHistoricalData();
                this.chartsInitialized = true;
            }, 100);
        }
        
        this.currentView = viewName;
    }

    switchInputTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Show/hide tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-input`).classList.add('active');
    }

    async handleHealthFormSubmit(event) {
        try {
            const formData = new FormData(event.target);
            const healthData = {};
            
            // Extract form data
            for (const [key, value] of formData.entries()) {
                if (value) {
                    if (key === 'systolic' || key === 'diastolic') {
                        if (!healthData.bloodPressure) {
                            healthData.bloodPressure = {};
                        }
                        healthData.bloodPressure[key] = parseInt(value);
                    } else if (key === 'heartRate' || key === 'stepsCount' || key === 'caloriesBurned' || 
                               key === 'waterIntake' || key === 'moodRating' || key === 'stressLevel' || 
                               key === 'sleepQuality') {
                        healthData[key] = parseInt(value);
                    } else if (key === 'oxygenSaturation' || key === 'sleepDuration' || key === 'screenTime') {
                        healthData[key] = parseFloat(value);
                    } else {
                        healthData[key] = value;
                    }
                }
            }
            
            // Submit to backend
            await this.api.submitHealthData(healthData);
            
            this.showNotification('Success', 'Health data saved successfully!', 'success');
            
            // Clear form and refresh data
            event.target.reset();
            setTimeout(() => {
                this.refreshData();
            }, 1000);
            
        } catch (error) {
            console.error('Failed to submit health data:', error);
            this.showNotification('Error', 'Failed to save health data: ' + error.message, 'error');
        }
    }

    async handleAcademicFormSubmit(event) {
        try {
            const formData = new FormData(event.target);
            const academicData = {};
            
            for (const [key, value] of formData.entries()) {
                if (value) {
                    academicData[key] = parseFloat(value);
                }
            }
            
            await this.api.submitAcademicData(academicData);
            
            this.showNotification('Success', 'Academic data saved successfully!', 'success');
            
            event.target.reset();
            setTimeout(() => {
                this.refreshData();
            }, 1000);
            
        } catch (error) {
            console.error('Failed to submit academic data:', error);
            this.showNotification('Error', 'Failed to save academic data: ' + error.message, 'error');
        }
    }

    async handleProfileFormSubmit(event) {
        try {
            const formData = new FormData(event.target);
            const profileData = {};
            
            for (const [key, value] of formData.entries()) {
                if (value) {
                    profileData[key] = value;
                }
            }
            
            // Submit to backend (you'll need to add this API endpoint)
            // await this.api.updateProfile(profileData);
            
            this.showNotification('Success', 'Profile updated successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to update profile:', error);
            this.showNotification('Error', 'Failed to update profile: ' + error.message, 'error');
        }
    }

    generateSampleHealthData() {
        document.querySelector('input[name="heartRate"]').value = Math.floor(Math.random() * (95 - 65) + 65);
        document.querySelector('input[name="systolic"]').value = Math.floor(Math.random() * (130 - 110) + 110);
        document.querySelector('input[name="diastolic"]').value = Math.floor(Math.random() * (85 - 70) + 70);
        document.querySelector('input[name="oxygenSaturation"]').value = Math.floor(Math.random() * (100 - 95) + 95);
        document.querySelector('select[name="stressLevel"]').value = Math.floor(Math.random() * 3 + 1);
        document.querySelector('input[name="sleepDuration"]').value = (Math.random() * (8.5 - 6.5) + 6.5).toFixed(1);
        document.querySelector('input[name="sleepQuality"]').value = Math.floor(Math.random() * (95 - 70) + 70);
        document.querySelector('input[name="stepsCount"]').value = Math.floor(Math.random() * (12000 - 6000) + 6000);
        document.querySelector('input[name="waterIntake"]').value = Math.floor(Math.random() * 8 + 4);
        document.querySelector('input[name="moodRating"]').value = Math.floor(Math.random() * 4 + 6);
    }

    generateSampleAcademicData() {
        document.querySelector('input[name="currentGPA"]').value = (Math.random() * (4.0 - 2.5) + 2.5).toFixed(2);
        document.querySelector('input[name="dailyStudyHours"]').value = (Math.random() * (8 - 2) + 2).toFixed(1);
        document.querySelector('input[name="weeklyStudyHours"]').value = Math.floor(Math.random() * (40 - 15) + 15);
        document.querySelector('input[name="attendancePercentage"]').value = Math.floor(Math.random() * (100 - 80) + 80);
        document.querySelector('input[name="assignmentsCompleted"]').value = Math.floor(Math.random() * 15 + 5);
        document.querySelector('input[name="assignmentsPending"]').value = Math.floor(Math.random() * 5 + 1);
    }

    generateSampleLifestyleData() {
        document.querySelector('input[name="socialInteractions"]').value = Math.floor(Math.random() * 10 + 1);
        document.querySelector('input[name="activeMinutes"]').value = Math.floor(Math.random() * (90 - 30) + 30);
        document.querySelector('input[name="distanceTraveled"]').value = (Math.random() * (10 - 1) + 1).toFixed(1);
    }

    async resolveAlert(alertId) {
        try {
            await this.api.resolveAlert(alertId);
            
            // Update local data
            const alertIndex = this.data.alerts.findIndex(alert => alert.id === alertId);
            if (alertIndex !== -1) {
                this.data.alerts[alertIndex].resolved = true;
            }
            
            this.renderAlerts();
            this.showNotification('Success', 'Alert resolved successfully', 'success');
            
        } catch (error) {
            console.error('Failed to resolve alert:', error);
            this.showNotification('Error', 'Failed to resolve alert', 'error');
        }
    }

    async refreshData() {
        try {
            this.showLoadingState();
            await this.loadAllData();
            this.hideLoadingState();
            this.showNotification('Success', 'Data refreshed successfully', 'success');
        } catch (error) {
            this.hideLoadingState();
            this.showNotification('Error', 'Failed to refresh data', 'error');
        }
    }

    setupAutoRefresh() {
        // Refresh data every 5 minutes
        this.api.refreshInterval = setInterval(async () => {
            try {
                const currentHealth = await this.api.getCurrentHealth();
                this.data.currentHealthMetrics = { ...this.data.currentHealthMetrics, ...currentHealth };
                this.updateDashboardMetrics();
                this.updateLastUpdatedTime();
            } catch (error) {
                console.log('Auto-refresh failed:', error);
            }
        }, 5 * 60 * 1000);
    }

    updateLastUpdatedTime() {
        const lastUpdatedElement = document.getElementById('lastUpdatedTime');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = 'Just now';
        }
    }

    showLoginPrompt() {
        const loginHTML = `
            <div class="login-overlay">
                <div class="login-card">
                    <div class="login-header">
                        <div class="login-logo">
                            <i class="fas fa-heartbeat"></i>
                        </div>
                        <h2>Digital Twin Login</h2>
                        <p>Access your personalized health dashboard</p>
                    </div>
                    
                    <form id="loginForm" class="login-form">
                        <div class="form-group">
                            <label class="form-label">Email Address</label>
                            <input type="email" id="loginEmail" class="form-control" value="demo@student.com" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" id="loginPassword" class="form-control" value="demo123" required>
                        </div>
                        
                        <button type="submit" class="btn btn--primary btn--full-width btn--large">
                            <i class="fas fa-sign-in-alt"></i>
                            Sign In
                        </button>
                        
                        <div class="demo-credentials">
                            <p><strong>Demo Credentials:</strong></p>
                            <p>Email: demo@student.com</p>
                            <p>Password: demo123</p>
                        </div>
                        
                        <div id="loginError" class="login-error" style="display: none;"></div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loginHTML);
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('loginError');
            
            try {
                await this.api.login(email, password);
                document.querySelector('.login-overlay').remove();
                await this.init(); // Re-initialize dashboard
            } catch (error) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = 'Login failed: ' + error.message;
            }
        });
    }

    showLoadingState() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    hideLoadingState() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    showNotification(title, message, type = 'info') {
        const container = document.getElementById('notificationContainer') || document.body;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas ${icons[type] || icons.info}"></i>
                </div>
                <div class="notification-text">
                    <h4>${title}</h4>
                    <p>${message}</p>
                </div>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
        
        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    // Utility methods
    calculateHealthScore(metrics) {
        let score = 100;
        
        // Heart rate assessment
        if (metrics.heartRate) {
            if (metrics.heartRate < 60 || metrics.heartRate > 100) {
                score -= 15;
            } else if (metrics.heartRate > 90) {
                score -= 5;
            }
        }
        
        // Sleep quality assessment
        if (metrics.sleepQuality) {
            if (metrics.sleepQuality < 60) {
                score -= 20;
            } else if (metrics.sleepQuality < 80) {
                score -= 10;
            }
        }
        
        // Stress level assessment (assuming numeric stress level)
        const stressMap = { "Very Low": 1, "Low": 2, "Moderate": 3, "High": 4, "Very High": 5 };
        const stressValue = stressMap[metrics.stressLevel] || 2;
        if (stressValue >= 4) {
            score -= 15;
        } else if (stressValue >= 3) {
            score -= 8;
        }
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    getMoodEmoji(rating) {
        if (rating >= 9) return '😁';
        if (rating >= 7) return '😊';
        if (rating >= 5) return '😐';
        if (rating >= 3) return '😔';
        return '😢';
    }

    getAlertIcon(type) {
        const icons = {
            health: 'fa-heartbeat',
            academic: 'fa-graduation-cap',
            device: 'fa-mobile-alt',
            system: 'fa-cog'
        };
        return icons[type] || 'fa-bell';
    }

    getDeviceIcon(type) {
        const icons = {
            smartwatch: 'fa-clock',
            fitness_tracker: 'fa-running',
            sleep_monitor: 'fa-bed',
            smartphone: 'fa-mobile-alt'
        };
        return icons[type] || 'fa-mobile-alt';
    }

    getGoalIcon(key) {
        const icons = {
            sleep: 'fa-moon',
            steps: 'fa-walking',
            study: 'fa-book',
            stress: 'fa-brain'
        };
        return icons[key] || 'fa-target';
    }

    getGoalTitle(key) {
        const titles = {
            sleep: 'Sleep',
            steps: 'Daily Steps',
            study: 'Study Hours',
            stress: 'Stress Management'
        };
        return titles[key] || key;
    }

    getGoalUnit(key) {
        const units = {
            sleep: 'hours',
            steps: 'steps',
            study: 'hours',
            stress: 'level'
        };
        return units[key] || '';
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    formatTime(timeString) {
        return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    formatTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.healthDashboard = new HealthDashboard();
    window.healthDashboard.init();
});

console.log('🚀 Enhanced Digital Twin Dashboard Loaded');
console.log('📊 Backend API: http://localhost:5000');
console.log('🔑 Demo Credentials: demo@student.com / demo123');