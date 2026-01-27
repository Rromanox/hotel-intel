/**
 * Mackinaw Intel - Main Application
 * Hotel Rate Intelligence Platform
 * 
 * Entry point that initializes all modules and handles app lifecycle
 */

const App = {
    isInitialized: false,

    /**
     * Initialize the application
     */
    async init() {
        console.log('🏨 Mackinaw Intel - Initializing...');

        try {
            // Initialize Charts first (no DOM dependency)
            Charts.init();
            console.log('✓ Charts initialized');

            // Initialize UI
            UI.init();
            console.log('✓ UI initialized');

            // Generate and load demo data
            console.log('🆕 Generating demo data...');
            const demoData = DemoData.generateAllData();
            Storage.saveData(demoData);
            Storage.setLastUpdate();
            console.log('✓ Demo data generated');

            // Load the data into UI
            this.loadExistingData();
            console.log('✓ Data loaded into UI');

            this.isInitialized = true;
            console.log('✅ Mackinaw Intel - Ready!');

            // Hide loading overlay
            UI.hideLoading();

        } catch (error) {
            console.error('❌ Initialization error:', error);
            // Still try to hide loading even on error
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
            }
            alert('Error initializing: ' + error.message);
        }
    },

    /**
     * Load existing data and update UI
     */
    loadExistingData() {
        const data = Storage.loadData();
        if (!data || !data.dates) {
            console.warn('No data available');
            return;
        }
        
        // Populate date selector
        UI.populateDateSelector();

        // Update header stats
        UI.updateHeaderStats();

        // Get the most recent date with data
        const dates = Object.keys(data.dates).sort();
        if (dates.length === 0) {
            console.warn('No dates in data');
            return;
        }
        
        const latestDate = dates[dates.length - 1];

        // Determine which month to show initially
        const [year, month] = latestDate.split('-');
        UI.selectMonth(parseInt(year), parseInt(month));

        // Update activity feed
        UI.updateActivityFeed();

        // Update settings page
        UI.updateSettingsPage();

        // Show demo data notice
        if (data.isDemo) {
            setTimeout(() => {
                UI.showToast('Viewing demo data. Click "Update Data" for real rates.', 'info');
            }, 1000);
        }
    },

    /**
     * Load demo data for testing
     */
    async loadDemoData() {
        UI.showToast('Generating demo data...', 'info');

        // Generate demo data
        const demoData = DemoData.generateAllData();
        
        // Save to storage
        Storage.saveData(demoData);
        Storage.setLastUpdate();

        // Load the data
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
            UI.showToast('API unavailable. Using demo data.', 'info');
            await this.loadDemoData();
        }
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

        const stats = Storage.getDateStats(dateStr);
        const yourHotels = Storage.getYourHotelsData(dateStr);

        if (!stats || yourHotels.length === 0) return null;

        const recommendations = [];

        yourHotels.forEach(hotel => {
            const position = hotel.marketPosition;
            const price = hotel.price;
            const marketAvg = stats.average;

            const percentilePosition = (position / stats.count) * 100;
            
            if (percentilePosition < 20) {
                const suggestedPrice = Math.round(price * 1.05);
                recommendations.push({
                    hotel: hotel.name,
                    currentPrice: price,
                    suggestion: 'Consider increasing',
                    suggestedPrice,
                    reason: `Currently in the lowest 20% of market prices. Market average is $${marketAvg}.`
                });
            } else if (percentilePosition > 80) {
                const suggestedPrice = Math.round(marketAvg * 1.1);
                recommendations.push({
                    hotel: hotel.name,
                    currentPrice: price,
                    suggestion: 'Consider reviewing',
                    suggestedPrice,
                    reason: `Currently in the highest 20% of market prices. May impact occupancy.`
                });
            } else {
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
        
        const scenarios = [
            { label: 'Current', rate: currentRate },
            { label: '-10%', rate: currentRate * 0.9 },
            { label: '-5%', rate: currentRate * 0.95 },
            { label: '+5%', rate: currentRate * 1.05 },
            { label: '+10%', rate: currentRate * 1.1 }
        ];

        const elasticity = -1.5;

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

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && App.isInitialized) {
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

// Export for external use
window.MackinawIntel = {
    App,
    API,
    Storage,
    Charts,
    UI,
    DemoData
};
