/**
 * Mackinaw Intel - UI Module
 * Handles all DOM interactions and UI updates
 */

const UI = {
    elements: {},
    currentPage: 'dashboard',
    currentMonth: { year: 2026, month: 5 },
    selectedDate: null,

    /**
     * Initialize UI elements and event listeners
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initTheme();
        this.initCalendar();
    },

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            // Layout
            sidebar: document.getElementById('sidebar'),
            mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
            loadingOverlay: document.getElementById('loading-overlay'),
            
            // Navigation
            navItems: document.querySelectorAll('.nav-item'),
            pages: document.querySelectorAll('.page'),
            pageTitle: document.getElementById('page-title'),
            
            // Theme
            themeToggle: document.getElementById('theme-toggle'),
            
            // Dashboard elements
            totalHotels: document.getElementById('total-hotels'),
            portfolioAvg: document.getElementById('portfolio-avg'),
            marketPosition: document.getElementById('market-position'),
            positionChange: document.getElementById('position-change'),
            nextUpdate: document.getElementById('next-update'),
            lastUpdateTime: document.getElementById('last-update-time'),
            currentDateRange: document.getElementById('current-date-range'),
            
            // Your hotels cards
            rivieraRate: document.getElementById('riviera-rate'),
            rivieraChange: document.getElementById('riviera-change'),
            rivieraVendor: document.getElementById('riviera-vendor'),
            rivieraRank: document.getElementById('riviera-rank'),
            rivieraRating: document.getElementById('riviera-rating'),
            americanRate: document.getElementById('american-rate'),
            americanChange: document.getElementById('american-change'),
            americanVendor: document.getElementById('american-vendor'),
            americanRank: document.getElementById('american-rank'),
            americanRating: document.getElementById('american-rating'),
            
            // Market metrics
            lowestRate: document.getElementById('lowest-rate'),
            lowestHotel: document.getElementById('lowest-hotel'),
            highestRate: document.getElementById('highest-rate'),
            highestHotel: document.getElementById('highest-hotel'),
            marketAvg: document.getElementById('market-avg'),
            avgCount: document.getElementById('avg-count'),
            priceSpread: document.getElementById('price-spread'),
            
            // Date selector
            dateSelector: document.getElementById('date-selector'),
            
            // Month buttons
            monthButtons: document.querySelectorAll('.month-btn'),
            
            // Tables
            topHotelsTable: document.getElementById('top-hotels-table'),
            competitorTable: document.getElementById('competitor-table'),
            activityFeed: document.getElementById('activity-feed'),
            
            // Calendar
            calendarMonth: document.getElementById('calendar-month'),
            calendarGrid: document.getElementById('calendar-grid'),
            prevMonth: document.getElementById('prev-month'),
            nextMonth: document.getElementById('next-month'),
            selectedDateDisplay: document.getElementById('selected-date'),
            dayRatesList: document.getElementById('day-rates-list'),
            
            // Charts
            rateTrendChart: document.getElementById('rate-trend-chart'),
            priceDistributionChart: document.getElementById('price-distribution-chart'),
            comparisonChart: document.getElementById('comparison-chart'),
            positionChart: document.getElementById('position-chart'),
            
            // Calculator
            calcCurrentRate: document.getElementById('calc-current-rate'),
            calcProposedRate: document.getElementById('calc-proposed-rate'),
            calcRooms: document.getElementById('calc-rooms'),
            calcDays: document.getElementById('calc-days'),
            calcResult: document.getElementById('calc-result'),
            calcSubtitle: document.getElementById('calc-subtitle'),
            
            // Competitor filters
            compSort: document.getElementById('comp-sort'),
            compPriceFilter: document.getElementById('comp-price-filter'),
            compDate: document.getElementById('comp-date'),
            exportBtn: document.getElementById('export-btn'),
            
            // Settings
            apiKeyInput: document.getElementById('api-key-input'),
            updateInterval: document.getElementById('update-interval'),
            lastSuccessfulUpdate: document.getElementById('last-successful-update'),
            clearCacheBtn: document.getElementById('clear-cache-btn'),
            exportAllBtn: document.getElementById('export-all-btn'),
            forceUpdateBtn: document.getElementById('force-update-btn'),
            
            // Update controls
            manualUpdateBtn: document.getElementById('manual-update-btn'),
            updateModal: document.getElementById('update-modal'),
            updateProgress: document.getElementById('update-progress'),
            updateStatus: document.getElementById('update-status'),
            
            // Toast container
            toastContainer: document.getElementById('toast-container')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Mobile menu toggle
        this.elements.mobileMenuToggle?.addEventListener('click', () => {
            this.elements.sidebar.classList.toggle('open');
        });

        // Navigation
        this.elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });

        // Theme toggle
        this.elements.themeToggle?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Month buttons
        this.elements.monthButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const [year, month] = btn.dataset.month.split('-');
                this.selectMonth(parseInt(year), parseInt(month));
            });
        });

        // Date selector
        this.elements.dateSelector?.addEventListener('change', (e) => {
            if (e.target.value) {
                this.updateDashboardForDate(e.target.value);
            }
        });

        // Calendar navigation
        this.elements.prevMonth?.addEventListener('click', () => {
            this.changeCalendarMonth(-1);
        });
        this.elements.nextMonth?.addEventListener('click', () => {
            this.changeCalendarMonth(1);
        });

        // Calculator inputs
        const calcInputs = [
            this.elements.calcCurrentRate,
            this.elements.calcProposedRate,
            this.elements.calcRooms,
            this.elements.calcDays
        ];
        calcInputs.forEach(input => {
            input?.addEventListener('input', () => this.updateCalculator());
        });

        // Competitor filters
        this.elements.compSort?.addEventListener('change', () => this.updateCompetitorTable());
        this.elements.compPriceFilter?.addEventListener('change', () => this.updateCompetitorTable());
        this.elements.compDate?.addEventListener('change', () => this.updateCompetitorTable());
        
        // Export button
        this.elements.exportBtn?.addEventListener('click', () => {
            const date = this.elements.compDate?.value;
            if (date) {
                Storage.exportDateAsCSV(date);
                this.showToast('CSV exported successfully', 'success');
            }
        });

        // Settings buttons
        this.elements.clearCacheBtn?.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all cached data?')) {
                Storage.clearAll();
                this.showToast('Cache cleared', 'info');
                location.reload();
            }
        });

        this.elements.exportAllBtn?.addEventListener('click', () => {
            Storage.exportData();
            this.showToast('Data exported', 'success');
        });

        this.elements.forceUpdateBtn?.addEventListener('click', () => {
            App.performUpdate();
        });

        this.elements.manualUpdateBtn?.addEventListener('click', () => {
            App.performUpdate();
        });

        // Close sidebar on outside click (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                !this.elements.sidebar.contains(e.target) && 
                !this.elements.mobileMenuToggle.contains(e.target)) {
                this.elements.sidebar.classList.remove('open');
            }
        });
    },

    /**
     * Navigate to a page
     */
    navigateTo(pageName) {
        // Update nav items
        this.elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageName);
        });

        // Update pages
        this.elements.pages.forEach(page => {
            page.classList.toggle('active', page.id === `page-${pageName}`);
        });

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            monthly: 'Monthly Views',
            analytics: 'Analytics Hub',
            competitors: 'Competitor Intelligence',
            settings: 'Settings'
        };
        this.elements.pageTitle.textContent = titles[pageName] || 'Dashboard';

        this.currentPage = pageName;

        // Page-specific initialization
        if (pageName === 'analytics') {
            this.initAnalyticsCharts();
        } else if (pageName === 'competitors') {
            this.initCompetitorPage();
        }

        // Close mobile sidebar
        this.elements.sidebar.classList.remove('open');
    },

    /**
     * Initialize theme
     */
    initTheme() {
        const settings = Storage.loadSettings();
        const savedTheme = settings.theme || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    },

    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        
        const settings = Storage.loadSettings();
        settings.theme = newTheme;
        Storage.saveSettings(settings);

        // Update charts
        Charts.updateTheme();
    },

    /**
     * Show loading overlay
     */
    showLoading() {
        this.elements.loadingOverlay.classList.remove('hidden');
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;

        this.elements.toastContainer.appendChild(toast);

        // Remove after delay
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.ui.toastDuration);
    },

    /**
     * Show update modal
     */
    showUpdateModal() {
        this.elements.updateModal.classList.add('active');
        this.elements.updateProgress.style.width = '0%';
        this.elements.updateStatus.textContent = 'Initializing...';
    },

    /**
     * Hide update modal
     */
    hideUpdateModal() {
        this.elements.updateModal.classList.remove('active');
    },

    /**
     * Update progress in modal
     */
    updateProgress(progress) {
        this.elements.updateProgress.style.width = `${progress.percentage}%`;
        this.elements.updateStatus.textContent = `Fetching ${progress.currentDate}... (${progress.completed}/${progress.total})`;
    },

    /**
     * Select a month
     */
    selectMonth(year, month) {
        this.elements.monthButtons.forEach(btn => {
            const [btnYear, btnMonth] = btn.dataset.month.split('-');
            btn.classList.toggle('active', parseInt(btnYear) === year && parseInt(btnMonth) === month);
        });

        // Update date range display
        this.elements.currentDateRange.textContent = `${MONTH_NAMES[month - 1]} ${year}`;

        // Update dashboard with first date of month
        const firstDate = `${year}-${String(month).padStart(2, '0')}-01`;
        this.updateDashboardForDate(firstDate);

        // Update calendar
        this.currentMonth = { year, month };
        this.renderCalendar();
    },

    /**
     * Initialize calendar
     */
    initCalendar() {
        this.renderCalendar();
    },

    /**
     * Render calendar grid
     */
    renderCalendar() {
        const { year, month } = this.currentMonth;
        const data = Storage.loadData();
        
        // Update header
        this.elements.calendarMonth.textContent = `${MONTH_NAMES[month - 1]} ${year}`;

        // Clear grid
        this.elements.calendarGrid.innerHTML = '';

        // Add day headers
        DAY_NAMES_SHORT.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-header';
            header.textContent = day;
            this.elements.calendarGrid.appendChild(header);
        });

        // Get first day of month and total days
        const firstDay = new Date(year, month - 1, 1).getDay();
        const totalDays = new Date(year, month, 0).getDate();

        // Add empty cells for days before first
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day empty';
            this.elements.calendarGrid.appendChild(empty);
        }

        // Add day cells
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayData = data?.dates?.[dateStr];
            
            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            cell.dataset.date = dateStr;

            if (dayData && dayData.hotels) {
                const stats = Storage.getDateStats(dateStr);
                cell.innerHTML = `
                    <span class="day-number">${day}</span>
                    <span class="day-rate">$${stats.average} avg</span>
                `;
                
                cell.addEventListener('click', () => this.selectCalendarDate(dateStr));
            } else {
                cell.classList.add('no-data');
                cell.innerHTML = `<span class="day-number">${day}</span>`;
            }

            if (dateStr === this.selectedDate) {
                cell.classList.add('selected');
            }

            this.elements.calendarGrid.appendChild(cell);
        }
    },

    /**
     * Change calendar month
     */
    changeCalendarMonth(delta) {
        let { year, month } = this.currentMonth;
        month += delta;

        if (month < 1) {
            month = 12;
            year--;
        } else if (month > 12) {
            month = 1;
            year++;
        }

        this.currentMonth = { year, month };
        this.renderCalendar();
    },

    /**
     * Select a calendar date
     */
    selectCalendarDate(dateStr) {
        this.selectedDate = dateStr;

        // Update calendar selection
        document.querySelectorAll('.calendar-day').forEach(cell => {
            cell.classList.toggle('selected', cell.dataset.date === dateStr);
        });

        // Update selected date display
        this.elements.selectedDateDisplay.textContent = formatDate(dateStr);

        // Show day rates
        this.showDayRates(dateStr);
    },

    /**
     * Show rates for a specific day
     */
    showDayRates(dateStr) {
        const dateData = Storage.getDateData(dateStr);
        
        if (!dateData || !dateData.hotels) {
            this.elements.dayRatesList.innerHTML = '<p class="placeholder-text">No data available for this date</p>';
            return;
        }

        const sortedHotels = [...dateData.hotels]
            .filter(h => h.price && h.price > 0)
            .sort((a, b) => a.price - b.price);

        this.elements.dayRatesList.innerHTML = sortedHotels.map((hotel, index) => `
            <div class="day-rate-item ${isYourHotel(hotel.name) ? 'highlight' : ''}">
                <div class="rate-hotel-info">
                    <span class="rate-hotel-rank">#${index + 1}</span>
                    <span class="rate-hotel-name">${hotel.name}</span>
                </div>
                <span class="rate-hotel-price">$${hotel.price}</span>
            </div>
        `).join('');
    },

    /**
     * Update dashboard with data for a specific date
     */
    updateDashboardForDate(dateStr) {
        const data = Storage.loadData();
        if (!data || !data.dates) return;

        // Find closest date with data
        const dates = Object.keys(data.dates).sort();
        let targetDate = dateStr;
        
        if (!data.dates[dateStr]) {
            // Find closest date in the same month
            const [year, month] = dateStr.split('-');
            const monthDates = dates.filter(d => d.startsWith(`${year}-${month}`));
            targetDate = monthDates[0] || dates[0];
        }

        if (!targetDate) return;

        const stats = Storage.getDateStats(targetDate);
        const yourHotels = Storage.getYourHotelsData(targetDate);

        // Update market metrics
        if (stats) {
            this.elements.lowestRate.textContent = formatCurrency(stats.lowest);
            this.elements.lowestHotel.textContent = stats.lowestHotel?.name || '--';
            this.elements.highestRate.textContent = formatCurrency(stats.highest);
            this.elements.highestHotel.textContent = stats.highestHotel?.name || '--';
            this.elements.marketAvg.textContent = formatCurrency(stats.average);
            this.elements.avgCount.textContent = `${stats.count} hotels`;
            this.elements.priceSpread.textContent = formatCurrency(stats.spread);
        }

        // Update your hotels
        const riviera = yourHotels.find(h => h.name?.toLowerCase().includes('riviera'));
        const american = yourHotels.find(h => h.name?.toLowerCase().includes('american'));

        if (riviera) {
            this.elements.rivieraRate.textContent = formatCurrency(riviera.price);
            this.elements.rivieraVendor.textContent = riviera.vendor || '--';
            this.elements.rivieraRank.textContent = `#${riviera.marketPosition || '--'}`;
            this.elements.rivieraRating.textContent = riviera.rating ? `${riviera.rating.toFixed(1)}★` : '--';
        }

        if (american) {
            this.elements.americanRate.textContent = formatCurrency(american.price);
            this.elements.americanVendor.textContent = american.vendor || '--';
            this.elements.americanRank.textContent = `#${american.marketPosition || '--'}`;
            this.elements.americanRating.textContent = american.rating ? `${american.rating.toFixed(1)}★` : '--';
        }

        // Calculate portfolio average
        const portfolioPrices = yourHotels.map(h => h.price).filter(p => p > 0);
        const portfolioAvg = portfolioPrices.length > 0 
            ? Math.round(portfolioPrices.reduce((a, b) => a + b, 0) / portfolioPrices.length)
            : null;
        this.elements.portfolioAvg.textContent = formatCurrency(portfolioAvg);

        // Calculate average market position
        const positions = yourHotels.map(h => h.marketPosition).filter(p => p);
        const avgPosition = positions.length > 0
            ? Math.round(positions.reduce((a, b) => a + b, 0) / positions.length)
            : null;
        this.elements.marketPosition.textContent = avgPosition || '--';

        // Update top hotels table
        this.updateTopHotelsTable(targetDate);

        // Update trend chart
        this.updateTrendChart();

        // Update date selector value
        if (this.elements.dateSelector) {
            this.elements.dateSelector.value = targetDate;
        }
    },

    /**
     * Update the top hotels table
     */
    updateTopHotelsTable(dateStr) {
        const dateData = Storage.getDateData(dateStr);
        if (!dateData || !dateData.hotels) return;

        const sortedHotels = [...dateData.hotels]
            .filter(h => h.price && h.price > 0)
            .sort((a, b) => a.price - b.price)
            .slice(0, 10);

        const tbody = this.elements.topHotelsTable.querySelector('tbody');
        tbody.innerHTML = sortedHotels.map((hotel, index) => `
            <tr>
                <td class="rank">#${index + 1}</td>
                <td class="hotel-name ${isYourHotel(hotel.name) ? 'highlight' : ''}">${hotel.name}</td>
                <td class="rate">$${hotel.price}</td>
                <td class="rating">${hotel.rating ? hotel.rating.toFixed(1) + '★' : '--'}</td>
            </tr>
        `).join('');
    },

    /**
     * Update trend chart on dashboard
     */
    updateTrendChart() {
        const data = Storage.loadData();
        if (!data || !data.dates) return;

        const trendData = Charts.prepareTrendData(data.dates);
        
        if (this.elements.rateTrendChart) {
            Charts.createRateTrendChart(
                this.elements.rateTrendChart.getContext('2d'),
                trendData
            );
        }
    },

    /**
     * Initialize analytics page charts
     */
    initAnalyticsCharts() {
        const data = Storage.loadData();
        if (!data || !data.dates) return;

        const dates = Object.keys(data.dates).sort();
        const latestDate = dates[dates.length - 1];
        const latestData = data.dates[latestDate];

        // Price distribution chart
        if (this.elements.priceDistributionChart) {
            const distData = Charts.prepareDistributionData(latestData);
            Charts.createPriceDistributionChart(
                this.elements.priceDistributionChart.getContext('2d'),
                distData
            );
        }

        // Comparison chart
        if (this.elements.comparisonChart) {
            const compData = Charts.prepareComparisonData(data.dates);
            Charts.createComparisonChart(
                this.elements.comparisonChart.getContext('2d'),
                compData
            );
        }

        // Position chart
        if (this.elements.positionChart) {
            const posData = Charts.preparePositionData(data.dates);
            Charts.createPositionChart(
                this.elements.positionChart.getContext('2d'),
                posData
            );
        }
    },

    /**
     * Update calculator result
     */
    updateCalculator() {
        const currentRate = parseFloat(this.elements.calcCurrentRate.value) || 0;
        const proposedRate = parseFloat(this.elements.calcProposedRate.value) || 0;
        const rooms = parseInt(this.elements.calcRooms.value) || 0;
        const days = parseInt(this.elements.calcDays.value) || 0;

        const currentRevenue = currentRate * rooms * days;
        const proposedRevenue = proposedRate * rooms * days;
        const impact = proposedRevenue - currentRevenue;

        const sign = impact >= 0 ? '+' : '';
        this.elements.calcResult.textContent = `${sign}$${formatCurrency(Math.abs(impact))}`;
        this.elements.calcResult.style.color = impact >= 0 ? '#10b981' : '#ef4444';
    },

    /**
     * Initialize competitor page
     */
    initCompetitorPage() {
        // Populate date selector
        const dates = Storage.getAvailableDates();
        this.elements.compDate.innerHTML = dates.map(date => 
            `<option value="${date}">${formatDate(date)}</option>`
        ).join('');

        // Select most recent date
        if (dates.length > 0) {
            this.elements.compDate.value = dates[dates.length - 1];
        }

        this.updateCompetitorTable();
    },

    /**
     * Update competitor table with current filters
     */
    updateCompetitorTable() {
        const dateStr = this.elements.compDate?.value;
        if (!dateStr) return;

        const dateData = Storage.getDateData(dateStr);
        if (!dateData || !dateData.hotels) return;

        let hotels = [...dateData.hotels].filter(h => h.price && h.price > 0);

        // Apply price filter
        const priceFilter = this.elements.compPriceFilter?.value;
        if (priceFilter && priceFilter !== 'all') {
            if (priceFilter === 'budget') {
                hotels = hotels.filter(h => h.price < 75);
            } else if (priceFilter === 'mid') {
                hotels = hotels.filter(h => h.price >= 75 && h.price < 125);
            } else if (priceFilter === 'premium') {
                hotels = hotels.filter(h => h.price >= 125);
            }
        }

        // Apply sort
        const sortBy = this.elements.compSort?.value || 'price-asc';
        switch (sortBy) {
            case 'price-asc':
                hotels.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                hotels.sort((a, b) => b.price - a.price);
                break;
            case 'rating-desc':
                hotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'name':
                hotels.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
        }

        // Render table
        const tbody = this.elements.competitorTable.querySelector('tbody');
        tbody.innerHTML = hotels.map((hotel, index) => {
            const isYours = isYourHotel(hotel.name);
            return `
                <tr class="${isYours ? 'highlight' : ''}">
                    <td>${index + 1}</td>
                    <td>${hotel.name}</td>
                    <td>$${hotel.price}</td>
                    <td>--</td>
                    <td>${hotel.vendor || '--'}</td>
                    <td>${hotel.rating ? hotel.rating.toFixed(1) : '--'}</td>
                    <td>${hotel.reviewCount || '--'}</td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Populate date selector dropdown
     */
    populateDateSelector() {
        const dates = Storage.getAvailableDates();
        this.elements.dateSelector.innerHTML = dates.map(date => 
            `<option value="${date}">${formatDate(date)}</option>`
        ).join('');

        // Select most recent date
        if (dates.length > 0) {
            this.elements.dateSelector.value = dates[dates.length - 1];
        }
    },

    /**
     * Update header stats
     */
    updateHeaderStats() {
        const data = Storage.loadData();
        const lastUpdate = Storage.getLastUpdate();
        const daysUntil = Storage.getDaysUntilUpdate();

        // Total hotels
        if (data && data.totalHotels) {
            this.elements.totalHotels.textContent = data.totalHotels;
        }

        // Next update
        this.elements.nextUpdate.textContent = `${daysUntil}d`;

        // Last update time
        if (lastUpdate) {
            const formatted = lastUpdate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
            this.elements.lastUpdateTime.textContent = formatted;
            this.elements.lastSuccessfulUpdate.textContent = formatted;
        }
    },

    /**
     * Update activity feed
     */
    updateActivityFeed() {
        const dates = Storage.getAvailableDates();
        if (dates.length < 2) {
            this.elements.activityFeed.innerHTML = '<p class="placeholder-text">Not enough data for rate changes</p>';
            return;
        }

        const latestDate = dates[dates.length - 1];
        const previousDate = dates[dates.length - 2];
        const changes = Storage.getRateChanges(previousDate, latestDate);

        if (changes.length === 0) {
            this.elements.activityFeed.innerHTML = '<p class="placeholder-text">No recent rate changes detected</p>';
            return;
        }

        // Show top 10 changes
        const topChanges = changes.slice(0, 10);

        this.elements.activityFeed.innerHTML = topChanges.map(change => {
            const isUp = change.change > 0;
            const icon = isUp 
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
            
            return `
                <div class="activity-item">
                    <div class="activity-icon ${isUp ? 'up' : 'down'}">${icon}</div>
                    <div class="activity-content">
                        <span class="activity-title">${change.name}</span>
                        <span class="activity-meta">
                            $${change.oldPrice} → $${change.newPrice} 
                            (${isUp ? '+' : ''}${change.change}%)
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Update settings page values
     */
    updateSettingsPage() {
        const settings = Storage.loadSettings();
        
        if (this.elements.apiKeyInput) {
            this.elements.apiKeyInput.value = settings.apiKey || '';
        }
        
        if (this.elements.updateInterval) {
            this.elements.updateInterval.value = settings.updateInterval || 15;
        }
    }
};
