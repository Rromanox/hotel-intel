/**
 * Mackinaw Intel - Storage Module
 * Handles localStorage operations for hotel data
 */

const Storage = {
    /**
     * Save all hotel data to localStorage
     */
    saveData(data) {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(CONFIG.updates.storageKey, serialized);
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    },

    /**
     * Load hotel data from localStorage
     */
    loadData() {
        try {
            const serialized = localStorage.getItem(CONFIG.updates.storageKey);
            if (!serialized) return null;
            return JSON.parse(serialized);
        } catch (error) {
            console.error('Error loading data:', error);
            return null;
        }
    },

    /**
     * Save settings to localStorage
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(CONFIG.updates.settingsKey, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    },

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const serialized = localStorage.getItem(CONFIG.updates.settingsKey);
            if (!serialized) return this.getDefaultSettings();
            return { ...this.getDefaultSettings(), ...JSON.parse(serialized) };
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.getDefaultSettings();
        }
    },

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            theme: CONFIG.ui.defaultTheme,
            updateInterval: CONFIG.updates.intervalDays,
            apiKey: CONFIG.api.apiKey
        };
    },

    /**
     * Get the last update timestamp
     */
    getLastUpdate() {
        // First check localStorage
        const timestamp = localStorage.getItem(CONFIG.updates.lastUpdateKey);
        if (timestamp) {
            return new Date(timestamp);
        }
        
        // Fallback: check the most recent timestamp in the data
        const data = this.loadData();
        if (data && data.dates) {
            let latestTimestamp = null;
            Object.values(data.dates).forEach(dateData => {
                if (dateData.timestamp) {
                    const ts = new Date(dateData.timestamp);
                    if (!latestTimestamp || ts > latestTimestamp) {
                        latestTimestamp = ts;
                    }
                }
            });
            if (latestTimestamp) {
                return latestTimestamp;
            }
        }
        
        return null;
    },

    /**
     * Set the last update timestamp
     */
    setLastUpdate(date = new Date()) {
        localStorage.setItem(CONFIG.updates.lastUpdateKey, date.toISOString());
    },

    /**
     * Check if an update is due
     */
    isUpdateDue() {
        const lastUpdate = this.getLastUpdate();
        if (!lastUpdate) return true;

        const settings = this.loadSettings();
        const intervalMs = settings.updateInterval * 24 * 60 * 60 * 1000;
        const now = new Date();
        
        return (now - lastUpdate) >= intervalMs;
    },

    /**
     * Get days until next scheduled update
     */
    getDaysUntilUpdate() {
        const lastUpdate = this.getLastUpdate();
        if (!lastUpdate) return 0;

        const settings = this.loadSettings();
        const intervalMs = settings.updateInterval * 24 * 60 * 60 * 1000;
        const nextUpdate = new Date(lastUpdate.getTime() + intervalMs);
        const now = new Date();

        const daysRemaining = Math.ceil((nextUpdate - now) / (24 * 60 * 60 * 1000));
        return Math.max(0, daysRemaining);
    },

    /**
     * Clear all stored data
     */
    clearAll() {
        localStorage.removeItem(CONFIG.updates.storageKey);
        localStorage.removeItem(CONFIG.updates.lastUpdateKey);
        localStorage.removeItem(CONFIG.updates.settingsKey);
    },

    /**
     * Export all data as JSON
     */
    exportData() {
        const data = this.loadData();
        const settings = this.loadSettings();
        const lastUpdate = this.getLastUpdate();

        const exportObj = {
            exportDate: new Date().toISOString(),
            lastUpdate: lastUpdate ? lastUpdate.toISOString() : null,
            settings,
            data
        };

        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `mackinaw-intel-export-${formatDateForAPI(new Date())}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    },

    /**
     * Export data for a specific date as CSV
     */
    exportDateAsCSV(dateStr) {
        const data = this.loadData();
        if (!data || !data.dates || !data.dates[dateStr]) {
            console.error('No data available for export');
            return;
        }

        const hotels = data.dates[dateStr].hotels;
        if (!hotels || hotels.length === 0) {
            console.error('No hotels data for this date');
            return;
        }

        // Create CSV content
        const headers = ['Rank', 'Hotel Name', 'Hotel ID', 'Price', 'Vendor', 'Rating', 'Review Count'];
        const rows = hotels.map((hotel, index) => [
            index + 1,
            `"${hotel.name || ''}"`,
            hotel.hotelId || '',
            hotel.price || '',
            `"${hotel.vendor || ''}"`,
            hotel.rating || '',
            hotel.reviewCount || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `mackinaw-hotels-${dateStr}.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
    },

    /**
     * Get data for a specific date
     */
    getDateData(dateStr) {
        const data = this.loadData();
        if (!data || !data.dates) return null;
        return data.dates[dateStr] || null;
    },

    /**
     * Get all available dates
     */
    getAvailableDates() {
        const data = this.loadData();
        if (!data || !data.dates) return [];
        return Object.keys(data.dates).sort();
    },

    /**
     * Get data for a date range
     */
    getDateRangeData(startDate, endDate) {
        const data = this.loadData();
        if (!data || !data.dates) return {};

        const result = {};
        const dates = Object.keys(data.dates).filter(date => {
            return date >= startDate && date <= endDate;
        });

        dates.forEach(date => {
            result[date] = data.dates[date];
        });

        return result;
    },

    /**
     * Get statistics for a date
     */
    getDateStats(dateStr) {
        const dateData = this.getDateData(dateStr);
        if (!dateData || !dateData.hotels || dateData.hotels.length === 0) {
            return null;
        }

        const hotels = dateData.hotels;
        const prices = hotels.map(h => h.price).filter(p => p && p > 0);
        
        if (prices.length === 0) return null;

        const sortedPrices = [...prices].sort((a, b) => a - b);
        const sum = prices.reduce((a, b) => a + b, 0);

        return {
            count: hotels.length,
            lowest: sortedPrices[0],
            highest: sortedPrices[sortedPrices.length - 1],
            average: Math.round(sum / prices.length),
            median: sortedPrices[Math.floor(sortedPrices.length / 2)],
            spread: sortedPrices[sortedPrices.length - 1] - sortedPrices[0],
            lowestHotel: hotels.find(h => h.price === sortedPrices[0]),
            highestHotel: hotels.find(h => h.price === sortedPrices[sortedPrices.length - 1])
        };
    },

    /**
     * Find your hotels in the data for a specific date
     */
    getYourHotelsData(dateStr) {
        const dateData = this.getDateData(dateStr);
        if (!dateData || !dateData.hotels) return [];

        const yourHotels = dateData.hotels.filter(hotel => isYourHotel(hotel.name));
        
        // Add market position (rank) - sort by price lowest to highest
        const sortedHotels = [...dateData.hotels]
            .filter(h => h.price && h.price > 0)
            .sort((a, b) => a.price - b.price);

        yourHotels.forEach(hotel => {
            // Find position by matching name (more reliable than hotelId)
            const position = sortedHotels.findIndex(h => 
                h.name?.toLowerCase().trim() === hotel.name?.toLowerCase().trim()
            );
            hotel.marketPosition = position !== -1 ? position + 1 : null;
        });

        return yourHotels;
    },

    /**
     * Calculate rate changes between two dates
     */
    getRateChanges(date1, date2) {
        const data1 = this.getDateData(date1);
        const data2 = this.getDateData(date2);

        if (!data1 || !data2 || !data1.hotels || !data2.hotels) {
            return [];
        }

        const changes = [];

        data2.hotels.forEach(hotel2 => {
            const hotel1 = data1.hotels.find(h => h.hotelId === hotel2.hotelId);
            if (hotel1 && hotel1.price && hotel2.price) {
                const change = calculatePercentChange(hotel1.price, hotel2.price);
                if (change && Math.abs(parseFloat(change)) > 0) {
                    changes.push({
                        name: hotel2.name,
                        hotelId: hotel2.hotelId,
                        oldPrice: hotel1.price,
                        newPrice: hotel2.price,
                        change: parseFloat(change),
                        isYourHotel: isYourHotel(hotel2.name)
                    });
                }
            }
        });

        // Sort by absolute change (largest first)
        changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

        return changes;
    },

    // ============================================
    // API CALL HISTORY
    // ============================================

    /**
     * Log an API call to history
     */
    logApiCall(entry) {
        const history = this.getApiHistory();
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: entry.action || 'API Call',
            details: entry.details || '',
            success: entry.success !== false,
            creditsUsed: entry.creditsUsed || 0,
            hotelsFound: entry.hotelsFound || 0,
            datesProcessed: entry.datesProcessed || 0,
            error: entry.error || null
        };

        // Add to beginning of array
        history.unshift(logEntry);

        // Keep only last 20 entries
        if (history.length > 20) {
            history.length = 20;
        }

        localStorage.setItem('mackinawIntelApiHistory', JSON.stringify(history));
        return logEntry;
    },

    /**
     * Get API call history
     */
    getApiHistory() {
        try {
            const history = localStorage.getItem('mackinawIntelApiHistory');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            return [];
        }
    },

    /**
     * Clear API history
     */
    clearApiHistory() {
        localStorage.removeItem('mackinawIntelApiHistory');
    },

    /**
     * Get data coverage statistics
     */
    getDataCoverage() {
        const data = this.loadData();
        if (!data || !data.dates) {
            return {
                type: 'none',
                realDataCount: 0,
                demoDataCount: 0,
                totalDates: 0,
                dateRange: null
            };
        }

        const dates = Object.keys(data.dates).sort();
        let realCount = 0;
        let demoCount = 0;

        dates.forEach(date => {
            const dateData = data.dates[date];
            if (dateData.isDemo || data.isDemo) {
                demoCount++;
            } else {
                realCount++;
            }
        });

        return {
            type: data.isDemo ? 'demo' : (realCount === dates.length ? 'live' : 'partial'),
            realDataCount: realCount,
            demoDataCount: demoCount,
            totalDates: dates.length,
            dateRange: dates.length > 0 ? {
                start: dates[0],
                end: dates[dates.length - 1]
            } : null
        };
    }
};
