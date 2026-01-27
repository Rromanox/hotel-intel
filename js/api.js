/**
 * Mackinaw Intel - API Module
 * Handles SerpAPI (Google Hotels) integration via Render proxy
 */

const API = {
    // Track API calls in this session
    callsThisSession: 0,
    lastKnownRemaining: null,

    /**
     * Build the API URL for SerpAPI proxy
     */
    buildUrl(checkinDate, checkoutDate) {
        const params = new URLSearchParams({
            checkin: checkinDate,
            checkout: checkoutDate,
            adults: CONFIG.api.params.adults
        });
        return `${CONFIG.api.proxyUrl}?${params.toString()}`;
    },

    /**
     * Calculate checkout date (next day)
     */
    getCheckoutDate(checkinDate) {
        const date = new Date(checkinDate + 'T00:00:00');
        date.setDate(date.getDate() + 1);
        return formatDateForAPI(date);
    },

    /**
     * Parse price string like "$215" to number
     */
    parsePrice(priceStr) {
        if (!priceStr) return null;
        if (typeof priceStr === 'number') return priceStr;
        
        const cleaned = String(priceStr).replace(/[$,]/g, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    },

    /**
     * Extract hotel data from SerpAPI property
     * ONLY keeps hotels that are in our tracked list
     */
    extractHotelData(property) {
        if (!property || !property.name) return null;

        // FILTER: Only keep tracked hotels (yours + competitors)
        if (!isTrackedHotel(property.name)) {
            return null;
        }

        // Get price from SerpAPI format
        const price = property.rate_per_night?.extracted_lowest || 
                      property.rate_per_night?.lowest ? this.parsePrice(property.rate_per_night.lowest) : 
                      property.total_rate?.extracted_lowest ||
                      null;

        if (!price) return null;

        return {
            name: property.name,
            price: price,
            vendor: property.rate_per_night?.source || 'Google Hotels',
            rating: property.overall_rating || null,
            reviewCount: property.reviews || null,
            category: getHotelCategory(property.name),
            hotelClass: property.hotel_class || null,
            type: property.type || 'hotel'
        };
    },

    /**
     * Check API account status
     */
    async checkAccount() {
        try {
            const response = await fetch(CONFIG.api.accountUrl);
            const data = await response.json();

            if (data.error) {
                return { success: false, error: data.error };
            }

            this.lastKnownRemaining = data.searchesRemaining;

            // Log the check
            Storage.logApiCall({
                action: 'Check Credits',
                details: `Remaining: ${data.searchesRemaining} / ${data.searchesPerMonth}`,
                success: true,
                creditsUsed: 0 // SerpAPI account check doesn't use credits!
            });

            return {
                success: true,
                plan: data.plan,
                requestLimit: data.searchesPerMonth,
                requestUsed: data.searchesUsed,
                remainingLimit: data.searchesRemaining
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch hotel data for a specific date
     */
    async fetchDateData(checkinDate) {
        const checkoutDate = this.getCheckoutDate(checkinDate);
        const url = this.buildUrl(checkinDate, checkoutDate);

        try {
            console.log(`📡 Fetching ${checkinDate}...`);
            const response = await fetch(url);
            this.callsThisSession++;

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('API_LIMIT_REACHED');
                }
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                console.error('API Error:', data.error);
                throw new Error(data.error);
            }

            const properties = data.properties || [];
            console.log(`📥 SerpAPI returned ${properties.length} hotels for ${checkinDate}`);

            // Extract and filter hotels
            const hotels = [];
            for (const property of properties) {
                const hotel = this.extractHotelData(property);
                if (hotel) {
                    hotels.push(hotel);
                }
            }

            console.log(`✅ Matched ${hotels.length} tracked hotels for ${checkinDate}`);

            // Sort by price
            hotels.sort((a, b) => a.price - b.price);

            return {
                timestamp: new Date().toISOString(),
                date: checkinDate,
                hotels: hotels,
                isPartial: false,
                isDemo: false
            };

        } catch (error) {
            console.error(`❌ Error fetching ${checkinDate}:`, error.message);
            throw error;
        }
    },

    /**
     * Fetch data for a range of dates
     */
    async fetchDateRange(dates, progressCallback = null, options = {}) {
        const { stopOnLimit = true } = options;
        
        const results = {};
        const errors = [];
        let completed = 0;
        let limitReached = false;

        this.callsThisSession = 0;

        for (const date of dates) {
            if (limitReached && stopOnLimit) break;

            try {
                const data = await this.fetchDateData(date);
                
                // Only save if we got hotels
                if (data.hotels && data.hotels.length > 0) {
                    results[date] = data;
                }
                
                completed++;

                if (progressCallback) {
                    progressCallback({
                        completed,
                        total: dates.length,
                        currentDate: date,
                        percentage: Math.round((completed / dates.length) * 100),
                        hotelsFound: data.hotels.length,
                        callsUsed: this.callsThisSession,
                        limitReached: false
                    });
                }

                // Rate limiting - wait between requests
                if (completed < dates.length) {
                    await this.delay(500);
                }

            } catch (error) {
                if (error.message === 'API_LIMIT_REACHED') {
                    limitReached = true;
                    errors.push({ date, error: 'API limit reached' });

                    if (progressCallback) {
                        progressCallback({
                            completed,
                            total: dates.length,
                            currentDate: date,
                            percentage: Math.round((completed / dates.length) * 100),
                            error: 'API LIMIT REACHED',
                            limitReached: true
                        });
                    }

                    if (stopOnLimit) break;
                } else {
                    errors.push({ date, error: error.message });
                }
            }
        }

        return {
            results,
            errors,
            datesCompleted: Object.keys(results).length,
            datesSkipped: dates.length - completed,
            callsUsed: this.callsThisSession,
            limitReached
        };
    },

    /**
     * Simple delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Format a date for the API (YYYY-MM-DD)
 */
function formatDateForAPI(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get all dates in a given month
 */
function getDatesInMonth(year, month) {
    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        dates.push(formatDateForAPI(date));
    }
    
    return dates;
}

/**
 * Month names for display
 */
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
