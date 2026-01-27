/**
 * Mackinaw Intel - Main Application
 * Hotel Rate Intelligence Platform
 * 
 * Entry point that initializes all modules and handles app lifecycle
 */

const App = {
    isInitialized: false,
    DATA_VERSION: '2.0', // Increment this when data structure changes

    /**
     * Initialize the application
     */
    async init() {
        console.log('🏨 Mackinaw Intel - Initializing...');

        try {
            // Initialize UI first
            UI.init();
            Charts.init();

            // Check for existing data and validate it
            const existingData = Storage.loadData();
            const needsReset = this.shouldResetData(existingData);
            
            if (needsReset) {
                console.log('🔄 Resetting old data format...');
                Storage.clearAll();
            }

            // Load whatever data we have (could be empty)
            this.loadExistingData();

            this.isInitialized = true;
            console.log('✅ Mackinaw Intel - Ready!');

            // Hide loading overlay
            setTimeout(() => UI.hideLoading(), 500);

        } catch (error) {
            console.error('❌ Initialization error:', error);
            UI.showToast('Error initializing application', 'error');
            UI.hideLoading();
        }
    },

    /**
     * Check if we need to reset data (version change or too many hotels)
     */
    shouldResetData(data) {
        if (!data) return false;
        
        // Check data version
        if (data.dataVersion !== this.DATA_VERSION) return true;
        
        // Check if we have old demo data
        if (data.isDemo === true) return true;
        
        // Check if we have old data with too many hotels (should be 15 now)
        if (data.totalHotels && data.totalHotels > 20) return true;
        
        // Check a sample date for hotel count
        if (data.dates) {
            const sampleDate = Object.values(data.dates)[0];
            if (sampleDate && sampleDate.hotels && sampleDate.hotels.length > 20) return true;
        }
        
        return false;
    },

    /**
     * Load existing data and update UI
     */
    loadExistingData() {
        const data = Storage.loadData() || { dates: {}, dataVersion: this.DATA_VERSION };
        const hasData = data.dates && Object.keys(data.dates).length > 0;
        
        // Update data status banners
        UI.updateDataStatusBanner();
        
        if (hasData) {
            // Populate date selector
            UI.populateDateSelector();

            // Update header stats
            UI.updateHeaderStats();

            // Always start on May 2026
            UI.selectMonth(2026, 5);

            // Update activity feed
            UI.updateActivityFeed();
        } else {
            // No data yet - show empty state
            console.log('📭 No rate data yet. User needs to load rates.');
            
            // Set default month view
            UI.selectMonth(2026, 5);
            
            // Update header with defaults
            if (UI.elements.totalHotels) UI.elements.totalHotels.textContent = '15';
            if (UI.elements.portfolioAvg) UI.elements.portfolioAvg.textContent = '--';
            if (UI.elements.marketPosition) UI.elements.marketPosition.textContent = '--';
        }

        // Update settings page
        UI.updateSettingsPage();
        
        // Update month banner
        UI.updateMonthDataBanner();
    },

    /**
     * Initialize empty data structure (no demo data)
     */
    async initEmptyData() {
        // Create empty data structure
        const emptyData = {
            dates: {},
            lastFullUpdate: null,
            totalHotels: 15,
            isDemo: false,
            dataVersion: this.DATA_VERSION
        };
        
        // Save to storage
        Storage.saveData(emptyData);

        // Load the empty state
        this.loadExistingData();
    },

    /**
     * Perform a data update from the API
     */
    async performUpdate() {
        UI.showUpdateModal();

        try {
            // Try to use real API first
            const result = await API.fullUpdate((progress) => {
                UI.updateProgress(progress);
            });

            UI.hideUpdateModal();

            if (result.success) {
                UI.showToast(`Successfully updated ${result.datesUpdated} dates`, 'success');
            } else {
                UI.showToast(`Updated with ${result.errors.length} errors`, 'error');
            }

            // Refresh UI
            this.loadExistingData();

        } catch (error) {
            console.error('Update failed:', error);
            UI.hideUpdateModal();
            
            // Fall back to demo data
            UI.showToast('API unavailable. Loading demo data instead.', 'info');
            await this.loadDemoData();
        }
    },

    /**
     * Export current view as PDF (simplified version)
     */
    exportPDF() {
        // This would typically use a library like jsPDF or html2pdf
        UI.showToast('PDF export coming soon!', 'info');
    },

    /**
     * Get summary statistics for the current month
     */
    getMonthSummary(year, month) {
        const data = Storage.loadData();
        if (!data || !data.dates) return null;

        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const monthDates = Object.keys(data.dates)
            .filter(d => d.startsWith(monthStr))
            .sort();

        if (monthDates.length === 0) return null;

        let totalAvg = 0;
        let yourAvg = 0;
        let lowestOverall = Infinity;
        let highestOverall = 0;
        let daysWithData = 0;

        monthDates.forEach(date => {
            const stats = Storage.getDateStats(date);
            if (stats) {
                totalAvg += stats.average;
                lowestOverall = Math.min(lowestOverall, stats.lowest);
                highestOverall = Math.max(highestOverall, stats.highest);
                daysWithData++;

                const yourHotels = Storage.getYourHotelsData(date);
                const yourPrices = yourHotels.map(h => h.price).filter(p => p > 0);
                if (yourPrices.length > 0) {
                    yourAvg += yourPrices.reduce((a, b) => a + b, 0) / yourPrices.length;
                }
            }
        });

        return {
            daysWithData,
            marketAverage: daysWithData > 0 ? Math.round(totalAvg / daysWithData) : null,
            yourAverage: daysWithData > 0 ? Math.round(yourAvg / daysWithData) : null,
            lowestRate: lowestOverall === Infinity ? null : lowestOverall,
            highestRate: highestOverall === 0 ? null : highestOverall
        };
    },

    /**
     * Compare two months' performance
     */
    compareMonths(year1, month1, year2, month2) {
        const summary1 = this.getMonthSummary(year1, month1);
        const summary2 = this.getMonthSummary(year2, month2);

        if (!summary1 || !summary2) return null;

        return {
            marketAvgChange: calculatePercentChange(summary1.marketAverage, summary2.marketAverage),
            yourAvgChange: calculatePercentChange(summary1.yourAverage, summary2.yourAverage),
            month1: summary1,
            month2: summary2
        };
    },

    /**
     * Get pricing recommendations
     */
    getPricingRecommendations(dateStr) {
        const data = Storage.loadData();
        if (!data || !data.dates || !data.dates[dateStr]) return null;

        const dateData = data.dates[dateStr];
        const stats = Storage.getDateStats(dateStr);
        const yourHotels = Storage.getYourHotelsData(dateStr);

        if (!stats || yourHotels.length === 0) return null;

        const recommendations = [];

        yourHotels.forEach(hotel => {
            const position = hotel.marketPosition;
            const price = hotel.price;
            const marketAvg = stats.average;

            // Calculate potential adjustments
            const percentilePosition = (position / stats.count) * 100;
            
            if (percentilePosition < 20) {
                // In bottom 20% - might be underpriced
                const suggestedPrice = Math.round(price * 1.05);
                recommendations.push({
                    hotel: hotel.name,
                    currentPrice: price,
                    suggestion: 'Consider increasing',
                    suggestedPrice,
                    reason: `Currently in the lowest 20% of market prices. Market average is $${marketAvg}.`
                });
            } else if (percentilePosition > 80) {
                // In top 20% - might be overpriced
                const suggestedPrice = Math.round(marketAvg * 1.1);
                recommendations.push({
                    hotel: hotel.name,
                    currentPrice: price,
                    suggestion: 'Consider reviewing',
                    suggestedPrice,
                    reason: `Currently in the highest 20% of market prices. May impact occupancy.`
                });
            } else {
                // Well positioned
                recommendations.push({
                    hotel: hotel.name,
                    currentPrice: price,
                    suggestion: 'Well positioned',
                    suggestedPrice: price,
                    reason: `Competitively positioned at rank #${position} of ${stats.count} hotels.`
                });
            }
        });

        return recommendations;
    },

    /**
     * Calculate revenue potential
     */
    calculateRevenuePotential(rooms, currentRate, occupancyPercent, days) {
        const occupancy = occupancyPercent / 100;
        const currentRevenue = rooms * currentRate * occupancy * days;
        
        // Calculate at different price points
        const scenarios = [
            { label: 'Current', rate: currentRate },
            { label: '-10%', rate: currentRate * 0.9 },
            { label: '-5%', rate: currentRate * 0.95 },
            { label: '+5%', rate: currentRate * 1.05 },
            { label: '+10%', rate: currentRate * 1.1 }
        ];

        // Simple price elasticity assumption
        const elasticity = -1.5; // 1% price increase = 1.5% occupancy decrease

        return scenarios.map(scenario => {
            const priceChange = (scenario.rate - currentRate) / currentRate;
            const occupancyChange = priceChange * elasticity;
            const adjustedOccupancy = Math.max(0.1, Math.min(1, occupancy + occupancyChange));
            const revenue = rooms * scenario.rate * adjustedOccupancy * days;

            return {
                ...scenario,
                adjustedOccupancy: Math.round(adjustedOccupancy * 100),
                revenue: Math.round(revenue),
                difference: Math.round(revenue - currentRevenue)
            };
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Handle visibility change (refresh data when tab becomes visible)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && App.isInitialized) {
        // Optionally refresh stats when user returns to tab
        UI.updateHeaderStats();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    UI.showToast('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    UI.showToast('You are offline. Viewing cached data.', 'info');
});

// Export for potential external use
window.MackinawIntel = {
    App,
    API,
    Storage,
    Charts,
    UI,
    DemoData
};
