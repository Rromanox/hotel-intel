/**
 * Mackinaw Intel - UI Module
 * Handles all DOM interactions and UI updates
 */

const UI = {
    elements: {},
    currentPage: 'dashboard',
    currentMonth: { year: 2026, month: 5 },
    selectedDate: null,
    eventsBound: false,

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
            
            // API Credits
            checkCreditsBtn: document.getElementById('check-credits-btn'),
            creditsRemaining: document.getElementById('credits-remaining'),
            creditsUsed: document.getElementById('credits-used'),
            creditsLimit: document.getElementById('credits-limit'),
            
            // API History
            apiHistoryList: document.getElementById('api-history-list'),
            clearHistoryBtn: document.getElementById('clear-history-btn'),
            
            // Data Coverage
            dataTypeDisplay: document.getElementById('data-type-display'),
            realDataCount: document.getElementById('real-data-count'),
            demoDataCount: document.getElementById('demo-data-count'),
            dateRangeDisplay: document.getElementById('date-range-display'),
            
            // Data Status (Dashboard)
            dataStatusBanner: document.getElementById('data-status-banner'),
            dataStatusTitle: document.getElementById('data-status-title'),
            dataStatusDetails: document.getElementById('data-status-details'),
            daysWithData: document.getElementById('days-with-data'),
            daysRemaining: document.getElementById('days-remaining'),
            
            // Month Data Banner (Monthly View)
            monthDataBanner: document.getElementById('month-data-banner'),
            monthBannerText: document.getElementById('month-banner-text'),
            loadMonthRatesBtn: document.getElementById('load-month-rates-btn'),
            
            // Update controls
            manualUpdateBtn: document.getElementById('manual-update-btn'),
            updateModal: document.getElementById('update-modal'),
            updateProgress: document.getElementById('update-progress'),
            updateStatus: document.getElementById('update-status'),
            progressDetails: document.getElementById('progress-details'),
            progressDates: document.getElementById('progress-dates'),
            progressCalls: document.getElementById('progress-calls'),
            
            // Date Picker Modal
            datePickerModal: document.getElementById('date-picker-modal'),
            closeDatePicker: document.getElementById('close-date-picker'),
            modalCreditsRemaining: document.getElementById('modal-credits-remaining'),
            modalRefreshCredits: document.getElementById('modal-refresh-credits'),
            fetchFromDate: document.getElementById('fetch-from-date'),
            fetchToDate: document.getElementById('fetch-to-date'),
            estDaysCount: document.getElementById('est-days-count'),
            estApiCalls: document.getElementById('est-api-calls'),
            estCreditsAvailable: document.getElementById('est-credits-available'),
            fetchWarning: document.getElementById('fetch-warning'),
            warningMessage: document.getElementById('warning-message'),
            quickMonthButtons: document.getElementById('quick-month-buttons'),
            cancelFetch: document.getElementById('cancel-fetch'),
            confirmFetch: document.getElementById('confirm-fetch'),
            
            // Fetch Results Modal
            fetchResultsModal: document.getElementById('fetch-results-modal'),
            fetchResultsTitle: document.getElementById('fetch-results-title'),
            resultsSummary: document.getElementById('results-summary'),
            closeResults: document.getElementById('close-results'),
            closeResultsBtn: document.getElementById('close-results-btn'),
            
            // Toast container
            toastContainer: document.getElementById('toast-container')
        };
    },

    /**
     * Bind event listeners (only once)
     */
    bindEvents() {
        // Prevent duplicate bindings
        if (this.eventsBound) return;
        this.eventsBound = true;
        
        // Mobile menu toggle
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        
        // Use pointerup - works on both touch and mouse
        this.elements.mobileMenuToggle?.addEventListener('pointerup', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.elements.sidebar.classList.contains('open')) {
                this.elements.sidebar.classList.remove('open');
                sidebarOverlay?.classList.remove('active');
            } else {
                this.elements.sidebar.classList.add('open');
                sidebarOverlay?.classList.add('active');
            }
        });
        
        // Close sidebar when clicking/touching overlay
        sidebarOverlay?.addEventListener('pointerup', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.elements.sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });

        // Navigation
        this.elements.navItems.forEach(item => {
            item.addEventListener('pointerup', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const page = item.dataset.page;
                this.navigateTo(page);
                // Close mobile sidebar after navigation
                this.elements.sidebar.classList.remove('open');
                sidebarOverlay?.classList.remove('active');
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
        this.elements.prevMonth?.addEventListener('pointerup', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.changeCalendarMonth(-1);
        });
        this.elements.nextMonth?.addEventListener('pointerup', (e) => {
            e.preventDefault();
            e.stopPropagation();
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

        // Check API Credits button
        this.elements.checkCreditsBtn?.addEventListener('click', async () => {
            const btn = this.elements.checkCreditsBtn;
            btn.disabled = true;
            btn.textContent = 'Checking...';
            
            try {
                const result = await API.checkAccount();
                if (result.success) {
                    this.elements.creditsRemaining.textContent = result.remainingLimit;
                    this.elements.creditsUsed.textContent = result.requestUsed;
                    this.elements.creditsLimit.textContent = result.requestLimit;
                    
                    // Color code based on usage
                    const usagePercent = (result.requestUsed / result.requestLimit) * 100;
                    if (usagePercent > 90) {
                        this.elements.creditsRemaining.classList.add('danger');
                    } else if (usagePercent > 70) {
                        this.elements.creditsRemaining.classList.add('warning');
                    }
                    
                    this.showToast(`API Credits: ${result.remainingLimit} remaining`, 'success');
                    
                    // Refresh the history display
                    this.updateApiHistory();
                } else {
                    this.showToast('Failed to check credits: ' + result.error, 'error');
                }
            } catch (error) {
                this.showToast('Error checking credits', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Check Credits';
            }
        });

        // Clear API History button
        this.elements.clearHistoryBtn?.addEventListener('click', () => {
            if (confirm('Clear all API call history?')) {
                Storage.clearApiHistory();
                this.updateApiHistory();
                this.showToast('API history cleared', 'info');
            }
        });

        // Load Month Rates button
        this.elements.loadMonthRatesBtn?.addEventListener('click', async () => {
            const year = this.currentMonth.year;
            const month = this.currentMonth.month;
            
            if (!confirm(`Load real rates for ${MONTH_NAMES[month - 1]} ${year}?\n\nThis will use approximately ${getDatesInMonth(year, month).length} API calls.`)) {
                return;
            }
            
            const btn = this.elements.loadMonthRatesBtn;
            btn.disabled = true;
            btn.textContent = 'Loading...';
            
            this.showUpdateModal();
            
            try {
                const result = await API.fetchMonth(year, month, (progress) => {
                    this.updateProgress(progress);
                });
                
                this.hideUpdateModal();
                
                if (result.limitReached) {
                    this.showToast(`API limit reached! Loaded ${result.datesUpdated} days.`, 'error');
                } else if (result.success) {
                    this.showToast(`Loaded ${result.datesUpdated} days for ${MONTH_NAMES[month - 1]}!`, 'success');
                } else {
                    this.showToast(`Partial load: ${result.datesUpdated} days`, 'error');
                }
                
                // Refresh the calendar and UI
                this.updateMonthDataBanner();
                this.renderCalendar();
                this.updateDataStatusBanner();
                App.loadExistingData();
                
            } catch (error) {
                this.hideUpdateModal();
                this.showToast('Error loading rates: ' + error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Load Rates for This Month';
            }
        });

        // Open Date Picker Modal (instead of direct update)
        this.elements.manualUpdateBtn?.addEventListener('click', () => {
            this.openDatePickerModal();
        });

        // Date Picker Modal events
        this.elements.closeDatePicker?.addEventListener('click', () => {
            this.closeDatePickerModal();
        });

        this.elements.cancelFetch?.addEventListener('click', () => {
            this.closeDatePickerModal();
        });

        this.elements.modalRefreshCredits?.addEventListener('click', async () => {
            await this.refreshModalCredits();
        });

        this.elements.fetchFromDate?.addEventListener('change', () => {
            this.updateFetchEstimation();
        });

        this.elements.fetchToDate?.addEventListener('change', () => {
            this.updateFetchEstimation();
        });

        this.elements.confirmFetch?.addEventListener('click', () => {
            this.executeFetch();
        });

        // Results Modal events
        this.elements.closeResults?.addEventListener('click', () => {
            this.closeFetchResultsModal();
        });

        this.elements.closeResultsBtn?.addEventListener('click', () => {
            this.closeFetchResultsModal();
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
        if (pageName === 'monthly') {
            // Refresh calendar when navigating to monthly view
            this.renderCalendar();
            this.updateMonthDataBanner();
        } else if (pageName === 'analytics') {
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
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('hidden');
            this.elements.loadingOverlay.style.display = 'none';
        }
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
        
        // Update month data banner
        this.updateMonthDataBanner();
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

            if (dayData && dayData.hotels && dayData.hotels.length > 0) {
                // Has real data
                const stats = Storage.getDateStats(dateStr);
                cell.innerHTML = `
                    <span class="day-number">${day}</span>
                    <span class="day-rate">$${stats.average} avg</span>
                `;
                cell.classList.add('has-data');
                cell.addEventListener('click', () => this.selectCalendarDate(dateStr));
            } else {
                // No data for this day
                cell.classList.add('no-data');
                cell.innerHTML = `
                    <span class="day-number">${day}</span>
                    <span class="day-rate no-data-label">No data</span>
                `;
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

        // Season limits: May 2026 to October 2026
        const minMonth = 5;  // May
        const maxMonth = 10; // October
        const seasonYear = 2026;
        
        // Don't go before May 2026
        if (year < seasonYear || (year === seasonYear && month < minMonth)) {
            year = seasonYear;
            month = minMonth;
        }
        
        // Don't go after October 2026
        if (year > seasonYear || (year === seasonYear && month > maxMonth)) {
            year = seasonYear;
            month = maxMonth;
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
     * Update the data status banner on Dashboard
     */
    updateDataStatusBanner() {
        const data = Storage.loadData();
        const banner = this.elements.dataStatusBanner;
        const title = this.elements.dataStatusTitle;
        const details = this.elements.dataStatusDetails;
        const daysLoaded = this.elements.daysWithData;
        const daysRemaining = this.elements.daysRemaining;
        
        if (!banner) return;

        // Count days with data
        const loadedDates = data?.dates ? Object.keys(data.dates).length : 0;
        const totalDays = 184; // May-October = 184 days
        const remaining = totalDays - loadedDates;

        if (daysLoaded) daysLoaded.textContent = loadedDates;
        if (daysRemaining) daysRemaining.textContent = remaining;

        if (loadedDates === 0) {
            banner.className = 'data-status-banner';
            if (title) title.textContent = 'No Rate Data Loaded';
            if (details) details.textContent = 'Go to Monthly Views and click "Load Rates for This Month" to fetch real hotel rates';
        } else if (loadedDates < totalDays) {
            banner.className = 'data-status-banner partial-data';
            if (title) title.textContent = `Partial Data: ${loadedDates} Days Loaded`;
            
            // List which months have data
            const monthsWithData = this.getMonthsWithData(data);
            if (details) details.textContent = `Data loaded for: ${monthsWithData}. Load more months to complete your data.`;
        } else {
            banner.className = 'data-status-banner has-data';
            if (title) title.textContent = 'All Rate Data Loaded';
            if (details) details.textContent = 'Complete data for May through October 2026';
        }
    },

    /**
     * Get a summary of which months have data
     */
    getMonthsWithData(data) {
        if (!data?.dates) return 'None';
        
        const monthCounts = {};
        Object.keys(data.dates).forEach(date => {
            const [year, month] = date.split('-');
            const key = `${MONTH_NAMES_SHORT[parseInt(month) - 1]} ${year}`;
            monthCounts[key] = (monthCounts[key] || 0) + 1;
        });

        return Object.entries(monthCounts)
            .map(([month, count]) => `${month} (${count} days)`)
            .join(', ') || 'None';
    },

    /**
     * Update the month data banner in Monthly View
     */
    updateMonthDataBanner() {
        const banner = this.elements.monthDataBanner;
        const text = this.elements.monthBannerText;
        const btn = this.elements.loadMonthRatesBtn;
        
        if (!banner) return;

        const year = this.currentMonth.year;
        const month = this.currentMonth.month;
        const monthName = MONTH_NAMES[month - 1];
        
        // Count how many days this month have data
        const data = Storage.loadData();
        const datesInMonth = getDatesInMonth(year, month);
        const datesWithData = datesInMonth.filter(date => data?.dates?.[date]).length;
        const totalDays = datesInMonth.length;

        if (datesWithData === 0) {
            banner.className = 'month-data-banner';
            if (text) text.textContent = `No rate data loaded for ${monthName} ${year}`;
            if (btn) {
                btn.textContent = `Load Rates for ${monthName} (~${totalDays} API calls)`;
                btn.style.display = 'block';
            }
        } else if (datesWithData < totalDays) {
            banner.className = 'month-data-banner partial-data';
            if (text) text.textContent = `Partial data: ${datesWithData} of ${totalDays} days loaded for ${monthName}`;
            if (btn) {
                btn.textContent = `Load Remaining Days (~${totalDays - datesWithData} API calls)`;
                btn.style.display = 'block';
            }
        } else {
            banner.className = 'month-data-banner has-data';
            if (text) text.textContent = `✅ All ${totalDays} days loaded for ${monthName} ${year}`;
            if (btn) btn.style.display = 'none';
        }
    },

    /**
     * Update API call history display
     */
    updateApiHistory() {
        const container = this.elements.apiHistoryList;
        if (!container) return;

        const history = Storage.getApiHistory();

        if (history.length === 0) {
            container.innerHTML = '<div class="api-history-empty">No API calls recorded yet</div>';
            return;
        }

        container.innerHTML = history.map(entry => {
            const date = new Date(entry.timestamp);
            const timeStr = date.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });

            const statusClass = entry.success ? 'success' : (entry.error ? 'error' : 'warning');

            return `
                <div class="api-history-item ${statusClass}">
                    <div class="api-history-main">
                        <div class="api-history-action">${entry.action}</div>
                        <div class="api-history-details">${entry.details || ''}</div>
                    </div>
                    <div class="api-history-meta">
                        <div class="api-history-time">${timeStr}</div>
                        ${entry.creditsUsed ? `<div class="api-history-credits">${entry.creditsUsed} call${entry.creditsUsed > 1 ? 's' : ''}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Update data coverage display
     */
    updateDataCoverage() {
        const coverage = Storage.getDataCoverage();

        // Data type
        if (this.elements.dataTypeDisplay) {
            this.elements.dataTypeDisplay.textContent = coverage.type.charAt(0).toUpperCase() + coverage.type.slice(1);
            this.elements.dataTypeDisplay.className = 'coverage-value ' + coverage.type;
        }

        // Real data count
        if (this.elements.realDataCount) {
            this.elements.realDataCount.textContent = coverage.realDataCount;
        }

        // Demo data count
        if (this.elements.demoDataCount) {
            this.elements.demoDataCount.textContent = coverage.demoDataCount;
        }

        // Date range
        if (this.elements.dateRangeDisplay && coverage.dateRange) {
            const start = new Date(coverage.dateRange.start + 'T00:00:00');
            const end = new Date(coverage.dateRange.end + 'T00:00:00');
            const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            this.elements.dateRangeDisplay.textContent = `${startStr} - ${endStr}`;
        } else if (this.elements.dateRangeDisplay) {
            this.elements.dateRangeDisplay.textContent = 'No data';
        }
    },

    /**
     * Update settings page with all info
     */
    updateSettingsPage() {
        // Update last update time
        if (this.elements.lastSuccessfulUpdate) {
            const lastUpdate = Storage.getLastUpdate();
            if (lastUpdate) {
                const date = new Date(lastUpdate);
                this.elements.lastSuccessfulUpdate.textContent = date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                });
            } else {
                this.elements.lastSuccessfulUpdate.textContent = 'Never';
            }
        }

        // Update API history
        this.updateApiHistory();

        // Update data coverage
        this.updateDataCoverage();
    },

    // ============================================
    // DATE PICKER MODAL FUNCTIONS
    // ============================================

    currentCredits: null,

    /**
     * Open the date picker modal
     */
    async openDatePickerModal() {
        const modal = this.elements.datePickerModal;
        if (!modal) return;

        // Populate date dropdowns
        this.populateDateDropdowns();

        // Populate quick month buttons
        this.populateQuickMonthButtons();

        // DON'T auto-check credits - it wastes an API call!
        // User can click "Refresh" button if they want to check
        // Just show cached value or "--"
        if (this.currentCredits !== null) {
            if (this.elements.modalCreditsRemaining) {
                this.elements.modalCreditsRemaining.textContent = this.currentCredits;
            }
            if (this.elements.estCreditsAvailable) {
                this.elements.estCreditsAvailable.textContent = this.currentCredits;
            }
        }

        // Show modal
        modal.classList.add('active');

        // Initial estimation
        this.updateFetchEstimation();
    },

    /**
     * Close the date picker modal
     */
    closeDatePickerModal() {
        const modal = this.elements.datePickerModal;
        if (modal) modal.classList.remove('active');
    },

    /**
     * Populate the date dropdown selectors
     */
    populateDateDropdowns() {
        const fromSelect = this.elements.fetchFromDate;
        const toSelect = this.elements.fetchToDate;
        if (!fromSelect || !toSelect) return;

        // Generate all dates from May to October 2026
        const dates = [];
        const { startMonth, startYear, monthsToCollect } = CONFIG.dateRange;

        for (let i = 0; i < monthsToCollect; i++) {
            let month = startMonth + i;
            let year = startYear;
            if (month > 12) { month -= 12; year++; }
            dates.push(...getDatesInMonth(year, month));
        }

        // Create options
        const createOptions = (selectedIndex = 0) => {
            return dates.map((date, idx) => {
                const d = new Date(date + 'T00:00:00');
                const label = d.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                });
                return `<option value="${date}" ${idx === selectedIndex ? 'selected' : ''}>${label}</option>`;
            }).join('');
        };

        fromSelect.innerHTML = createOptions(0);
        toSelect.innerHTML = createOptions(Math.min(9, dates.length - 1)); // Default to 10 days
    },

    /**
     * Populate quick month buttons
     */
    populateQuickMonthButtons() {
        const container = this.elements.quickMonthButtons;
        if (!container) return;

        const data = Storage.loadData();
        const { startMonth, startYear, monthsToCollect } = CONFIG.dateRange;

        let html = '';

        for (let i = 0; i < monthsToCollect; i++) {
            let month = startMonth + i;
            let year = startYear;
            if (month > 12) { month -= 12; year++; }

            const monthName = MONTH_NAMES_SHORT[month - 1];
            const datesInMonth = getDatesInMonth(year, month);
            const totalDays = datesInMonth.length;

            // Check how many days have data
            let daysWithData = 0;
            let daysWithRealData = 0;
            datesInMonth.forEach(date => {
                if (data?.dates?.[date]) {
                    daysWithData++;
                    if (!data.dates[date].isDemo && !data.isDemo) {
                        daysWithRealData++;
                    }
                }
            });

            let statusClass = '';
            let statusText = '';
            if (daysWithRealData === totalDays) {
                statusClass = 'loaded';
                statusText = '✓ Loaded';
            } else if (daysWithRealData > 0) {
                statusClass = 'partial';
                statusText = `${daysWithRealData}/${totalDays} days`;
            }

            const canLoad = this.currentCredits === null || this.currentCredits >= totalDays;

            html += `
                <button class="quick-month-btn ${statusClass}" 
                        data-month="${month}" 
                        data-year="${year}"
                        ${!canLoad ? 'disabled' : ''}>
                    <span class="quick-month-name">${monthName}</span>
                    <span class="quick-month-calls">${totalDays} calls</span>
                    ${statusText ? `<span class="quick-month-status ${statusClass}">${statusText}</span>` : ''}
                </button>
            `;
        }

        container.innerHTML = html;

        // Add click events to month buttons
        container.querySelectorAll('.quick-month-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const month = parseInt(btn.dataset.month);
                const year = parseInt(btn.dataset.year);
                await this.fetchMonth(year, month);
            });
        });
    },

    /**
     * Refresh credits in the modal
     */
    async refreshModalCredits() {
        const btn = this.elements.modalRefreshCredits;
        if (btn) {
            btn.disabled = true;
            btn.textContent = '...';
        }

        try {
            const result = await API.checkAccount();
            if (result.success) {
                this.currentCredits = result.remainingLimit;
                if (this.elements.modalCreditsRemaining) {
                    this.elements.modalCreditsRemaining.textContent = result.remainingLimit;
                }
                if (this.elements.estCreditsAvailable) {
                    this.elements.estCreditsAvailable.textContent = result.remainingLimit;
                }
                // Refresh month buttons with new credit info
                this.populateQuickMonthButtons();
                this.updateFetchEstimation();
            } else {
                this.currentCredits = null;
                if (this.elements.modalCreditsRemaining) {
                    this.elements.modalCreditsRemaining.textContent = 'Error';
                }
            }
        } catch (error) {
            this.currentCredits = null;
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Refresh';
            }
        }
    },

    /**
     * Update the fetch estimation based on selected dates
     */
    updateFetchEstimation() {
        const fromDate = this.elements.fetchFromDate?.value;
        const toDate = this.elements.fetchToDate?.value;

        if (!fromDate || !toDate) return;

        // Calculate days between dates
        const from = new Date(fromDate + 'T00:00:00');
        const to = new Date(toDate + 'T00:00:00');
        const days = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;

        const validDays = Math.max(0, days);
        const apiCalls = validDays; // 1 call per day in quick mode

        // Update display
        if (this.elements.estDaysCount) {
            this.elements.estDaysCount.textContent = validDays;
        }
        if (this.elements.estApiCalls) {
            this.elements.estApiCalls.textContent = apiCalls;
        }

        // Check credits warning
        const warning = this.elements.fetchWarning;
        const confirmBtn = this.elements.confirmFetch;

        if (this.currentCredits !== null && apiCalls > this.currentCredits) {
            // Not enough credits
            if (warning) {
                warning.style.display = 'flex';
                const maxDays = this.currentCredits;
                const maxDate = new Date(from);
                maxDate.setDate(maxDate.getDate() + maxDays - 1);
                const maxDateStr = maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                if (this.elements.warningMessage) {
                    if (this.currentCredits === 0) {
                        this.elements.warningMessage.textContent = 'You have no credits remaining. Cannot fetch any data.';
                    } else {
                        this.elements.warningMessage.textContent = 
                            `You need ${apiCalls} calls but only have ${this.currentCredits}. ` +
                            `Max you can fetch: ${fromDate.split('-').slice(1).join('/')} to ${maxDateStr} (${maxDays} days)`;
                    }
                }
            }
            if (confirmBtn) {
                confirmBtn.disabled = this.currentCredits === 0;
                confirmBtn.textContent = this.currentCredits === 0 ? 'No Credits' : `Fetch ${this.currentCredits} Days`;
            }
        } else {
            // Enough credits
            if (warning) warning.style.display = 'none';
            if (confirmBtn) {
                confirmBtn.disabled = validDays === 0;
                confirmBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
                        <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Fetch ${validDays} Days
                `;
            }
        }
    },

    /**
     * Execute the fetch based on selected date range
     */
    async executeFetch() {
        const fromDate = this.elements.fetchFromDate?.value;
        const toDate = this.elements.fetchToDate?.value;

        if (!fromDate || !toDate) return;

        // Generate dates array
        const dates = [];
        const from = new Date(fromDate + 'T00:00:00');
        const to = new Date(toDate + 'T00:00:00');

        // Limit to available credits if necessary
        let maxDates = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;
        if (this.currentCredits !== null && maxDates > this.currentCredits) {
            maxDates = this.currentCredits;
        }

        for (let i = 0; i < maxDates; i++) {
            const date = new Date(from);
            date.setDate(from.getDate() + i);
            dates.push(formatDateForAPI(date));
        }

        if (dates.length === 0) {
            this.showToast('No dates to fetch', 'error');
            return;
        }

        // Close date picker and show progress
        this.closeDatePickerModal();
        this.showUpdateModal();

        // Execute fetch
        const result = await API.fetchDateRange(dates, (progress) => {
            this.updateProgress(progress);
            if (this.elements.progressDates) {
                this.elements.progressDates.textContent = `${progress.completed} / ${progress.total} dates`;
            }
            if (this.elements.progressCalls) {
                this.elements.progressCalls.textContent = `${progress.callsUsed} API calls used`;
            }
        }, { fullFetch: false, stopOnLimit: true });

        // Save data - ONLY dates that have hotels!
        if (Object.keys(result.results).length > 0) {
            const existingData = Storage.loadData() || { dates: {}, dataVersion: '2.0' };
            
            // Only save dates that actually have hotels
            let savedCount = 0;
            const datesToSaveToDb = {};
            
            Object.keys(result.results).forEach(date => {
                const dateData = result.results[date];
                if (dateData.hotels && dateData.hotels.length > 0) {
                    dateData.isDemo = false;
                    existingData.dates[date] = dateData;
                    datesToSaveToDb[date] = dateData;
                    savedCount++;
                    console.log(`✅ Saved ${date}: ${dateData.hotels.length} hotels`);
                } else {
                    console.log(`⏭️ Skipped ${date}: 0 hotels (not saving)`);
                }
            });
            
            if (savedCount > 0) {
                existingData.lastFullUpdate = new Date().toISOString();
                // Count unique hotels across all dates
                const allHotels = new Set();
                Object.values(existingData.dates).forEach(d => {
                    d.hotels?.forEach(h => allHotels.add(h.name));
                });
                existingData.totalHotels = allHotels.size;
                existingData.isDemo = false;
                existingData.dataVersion = '2.0';
                Storage.saveData(existingData);
                Storage.setLastUpdate();
                
                // Also save to database for cross-device sync
                API.saveBulkToDatabase(datesToSaveToDb);
            }
        }

        // Log the fetch
        Storage.logApiCall({
            action: 'Custom Date Range Fetch',
            details: `${dates[0]} to ${dates[dates.length - 1]} (${result.datesCompleted} days)`,
            success: !result.limitReached,
            creditsUsed: result.callsUsed,
            datesProcessed: result.datesCompleted,
            hotelsFound: Object.values(result.results)[0]?.hotels?.length || 0,
            error: result.limitReached ? 'API limit reached' : null
        });

        this.hideUpdateModal();

        // Show results
        this.showFetchResults(result, dates);

        // Refresh the main UI
        App.loadExistingData();
    },

    /**
     * Fetch a specific month
     */
    async fetchMonth(year, month) {
        const dates = getDatesInMonth(year, month);
        const monthName = MONTH_NAMES[month - 1];

        // Check credits
        if (this.currentCredits !== null && dates.length > this.currentCredits) {
            if (!confirm(`You need ${dates.length} credits but only have ${this.currentCredits}.\n\nFetch first ${this.currentCredits} days of ${monthName}?`)) {
                return;
            }
            dates.length = this.currentCredits;
        }

        // Close date picker and show progress
        this.closeDatePickerModal();
        this.showUpdateModal();

        // Execute fetch
        const result = await API.fetchDateRange(dates, (progress) => {
            this.updateProgress(progress);
            if (this.elements.progressDates) {
                this.elements.progressDates.textContent = `${progress.completed} / ${progress.total} dates`;
            }
            if (this.elements.progressCalls) {
                this.elements.progressCalls.textContent = `${progress.callsUsed} API calls used`;
            }
        }, { fullFetch: false, stopOnLimit: true });

        // Save data - ONLY dates that have hotels!
        if (Object.keys(result.results).length > 0) {
            const existingData = Storage.loadData() || { dates: {}, dataVersion: '2.0' };
            
            // Only save dates that actually have hotels
            let savedCount = 0;
            const datesToSaveToDb = {};
            
            Object.keys(result.results).forEach(date => {
                const dateData = result.results[date];
                if (dateData.hotels && dateData.hotels.length > 0) {
                    dateData.isDemo = false;
                    existingData.dates[date] = dateData;
                    datesToSaveToDb[date] = dateData;
                    savedCount++;
                    console.log(`✅ Saved ${date}: ${dateData.hotels.length} hotels`);
                } else {
                    console.log(`⏭️ Skipped ${date}: 0 hotels (not saving)`);
                }
            });
            
            if (savedCount > 0) {
                existingData.lastFullUpdate = new Date().toISOString();
                // Count unique hotels across all dates
                const allHotels = new Set();
                Object.values(existingData.dates).forEach(d => {
                    d.hotels?.forEach(h => allHotels.add(h.name));
                });
                existingData.totalHotels = allHotels.size;
                existingData.isDemo = false;
                existingData.dataVersion = '2.0';
                Storage.saveData(existingData);
                Storage.setLastUpdate();
                
                // Also save to database for cross-device sync
                API.saveBulkToDatabase(datesToSaveToDb);
            }
        }

        // Log
        Storage.logApiCall({
            action: `Fetch ${monthName} ${year}`,
            details: `${result.datesCompleted} of ${dates.length} days fetched`,
            success: !result.limitReached,
            creditsUsed: result.callsUsed,
            datesProcessed: result.datesCompleted,
            hotelsFound: Object.values(result.results)[0]?.hotels?.length || 0,
            error: result.limitReached ? 'API limit reached' : null
        });

        this.hideUpdateModal();
        this.showFetchResults(result, dates);
        App.loadExistingData();
    },

    /**
     * Show fetch results modal
     */
    showFetchResults(result, requestedDates) {
        const modal = this.elements.fetchResultsModal;
        const title = this.elements.fetchResultsTitle;
        const summary = this.elements.resultsSummary;

        if (!modal || !summary) return;

        // Build results HTML
        let html = '';

        if (result.datesCompleted > 0) {
            const fetchedDates = Object.keys(result.results).sort();
            const firstDate = new Date(fetchedDates[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const lastDate = new Date(fetchedDates[fetchedDates.length - 1] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            html += `
                <div class="result-item success">
                    <span class="result-icon">✅</span>
                    <div class="result-text">
                        <strong>Data Fetched Successfully</strong>
                        <span>${firstDate} - ${lastDate} (${result.datesCompleted} days)</span>
                    </div>
                </div>
            `;
        }

        if (result.limitReached) {
            html += `
                <div class="result-item warning">
                    <span class="result-icon">⚠️</span>
                    <div class="result-text">
                        <strong>API Limit Reached</strong>
                        <span>Fetching stopped due to credit limit</span>
                    </div>
                </div>
            `;
        }

        if (result.datesSkipped > 0) {
            html += `
                <div class="result-item error">
                    <span class="result-icon">❌</span>
                    <div class="result-text">
                        <strong>Days Not Fetched</strong>
                        <span>${result.datesSkipped} days could not be fetched</span>
                    </div>
                </div>
            `;
        }

        html += `
            <div class="result-item">
                <span class="result-icon">📊</span>
                <div class="result-text">
                    <strong>API Calls Used</strong>
                    <span>${result.callsUsed} calls</span>
                </div>
            </div>
        `;

        if (title) {
            title.textContent = result.limitReached ? 'Fetch Partially Complete' : 'Fetch Complete';
        }

        summary.innerHTML = html;
        modal.classList.add('active');
    },

    /**
     * Close fetch results modal
     */
    closeFetchResultsModal() {
        const modal = this.elements.fetchResultsModal;
        if (modal) modal.classList.remove('active');
    }
};
