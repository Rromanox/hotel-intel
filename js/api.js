/**
 * Mackinaw Intel - API Module
 * Handles MakCorp API integration with secure proxy support
 * 
 * Supports two modes:
 * - 'proxy': Calls your Render server (API key safe on server)
 * - 'direct': Calls MakCorps directly (API key in localStorage)
 */

const API = {
    // Track API calls in this session
    callsThisSession: 0,
    lastKnownLimit: null,
    lastKnownRemaining: null,

    /**
     * Get the API key (from settings/localStorage)
     */
    getApiKey() {
        const settings = Storage.loadSettings();
        return settings.apiKey || CONFIG.api.apiKey || '';
    },

    /**
     * Build the API URL based on mode (proxy or direct)
     */
    buildUrl(checkinDate, checkoutDate, pagination = 0) {
        const mode = CONFIG.api.mode;
        const baseUrl = mode === 'proxy' ? CONFIG.api.proxyUrl : CONFIG.api.directUrl;
        
        const params = new URLSearchParams({
            cityid: CONFIG.api.cityId,
            pagination: String(pagination),
            cur: CONFIG.api.params.cur,
            rooms: CONFIG.api.params.rooms,
            adults: CONFIG.api.params.adults,
            checkin: checkinDate,
            checkout: checkoutDate
        });

        // Only add API key for direct mode
        if (mode === 'direct') {
            const apiKey = this.getApiKey();
            if (!apiKey) {
                throw new Error('API key not set. Go to Settings to enter your MakCorps API key.');
            }
            params.append('api_key', apiKey);
        }

        return `${baseUrl}?${params.toString()}`;
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
     * Parse price string like "$215" or "$1,443" to number
     */
    parsePrice(priceStr) {
        if (!priceStr) return null;
        if (typeof priceStr === 'number') return priceStr;
        
        const cleaned = String(priceStr).replace(/[$,]/g, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    },

    /**
     * Extract hotel data from API response item
     * ONLY keeps hotels that are in our tracked list (15 hotels)
     */
    extractHotelData(item) {
        if (!item || !item.name) return null;

        // FILTER: Only keep tracked hotels (yours + competitors)
        if (!isTrackedHotel(item.name)) {
            return null; // Skip hotels we don't care about
        }

        // Get the lowest price from up to 4 vendors
        let lowestPrice = null;
        let lowestVendor = null;

        for (let i = 1; i <= 4; i++) {
            const priceKey = `price${i}`;
            const vendorKey = `vendor${i}`;
            
            if (item[priceKey]) {
                const price = this.parsePrice(item[priceKey]);
                if (price && (lowestPrice === null || price < lowestPrice)) {
                    lowestPrice = price;
                    lowestVendor = item[vendorKey] || 'Unknown';
                }
            }
        }

        if (!lowestPrice) return null;

        return {
            name: item.name,
            hotelId: item.hotelId || null,
            price: lowestPrice,
            vendor: lowestVendor,
            rating: item.reviews?.rating || null,
            reviewCount: item.reviews?.count || null,
            category: getHotelCategory(item.name) // 'yours' or 'competitor'
        };
    },

    /**
     * Check API account status and remaining credits
     */
    async checkAccount() {
        try {
            let url;
            if (CONFIG.api.mode === 'proxy') {
                url = CONFIG.api.proxyUrl.replace('/city', '/account');
            } else {
                const apiKey = this.getApiKey();
                if (!apiKey) {
                    return { success: false, error: 'API key not set' };
                }
                url = `https://api.makcorps.com/account?api_key=${apiKey}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                this.lastKnownLimit = data.requestLimit;
                this.lastKnownRemaining = data.remainingLimit;
                return {
                    success: true,
                    requestLimit: data.requestLimit,
                    requestUsed: data.requestUsed,
                    remainingLimit: data.remainingLimit
                };
            }
            return { success: false, error: 'Request failed' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Estimate API calls needed
     */
    estimateCalls(numDates, fullFetch = false) {
        const callsPerDate = fullFetch ? 3 : 1;
        return numDates * callsPerDate;
    },

    /**
     * Fetch hotel data for a specific date
     * @param {string} checkinDate - Date in YYYY-MM-DD format
     * @param {boolean} fullFetch - If true, fetch all pages (~3 calls). If false, page 0 only (1 call)
     */
    async fetchDateData(checkinDate, fullFetch = false) {
        const checkoutDate = this.getCheckoutDate(checkinDate);
        const allHotels = [];
        let currentPage = 0;
        let hasMorePages = true;
        const maxPages = fullFetch ? 5 : 1;

        while (hasMorePages && currentPage < maxPages) {
            const url = this.buildUrl(checkinDate, checkoutDate, currentPage);

            try {
                const response = await fetch(url);
                this.callsThisSession++;
                
                if (response.status === 403) {
                    throw new Error('API_LIMIT_REACHED');
                }
                
                if (response.status === 404) {
                    throw new Error('API_KEY_INVALID');
                }
                
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status}`);
                }

                const data = await response.json();
                
                if (!Array.isArray(data) || data.length === 0) {
                    hasMorePages = false;
                    break;
                }

                // Check for pagination info (last item in array)
                const lastItem = data[data.length - 1];
                let paginationInfo = null;
                
                if (Array.isArray(lastItem) && lastItem.length > 0 && lastItem[0].totalHotelCount) {
                    paginationInfo = lastItem[0];
                }

                // Process hotel data
                const hotelsData = paginationInfo ? data.slice(0, -1) : data;
                
                for (const item of hotelsData) {
                    if (Array.isArray(item)) continue;
                    const hotel = this.extractHotelData(item);
                    if (hotel) {
                        allHotels.push(hotel);
                    }
                }

                // Check if there are more pages
                if (fullFetch && paginationInfo) {
                    const totalPages = paginationInfo.totalpageCount || 1;
                    currentPage++;
                    hasMorePages = currentPage < totalPages;
                } else {
                    hasMorePages = false;
                }

                // Rate limiting between pages
                if (hasMorePages) {
                    await this.delay(300);
                }

            } catch (error) {
                if (error.message === 'API_LIMIT_REACHED' || error.message === 'API_KEY_INVALID') {
                    throw error;
                }
                console.error(`Error fetching page ${currentPage} for ${checkinDate}:`, error);
                throw error;
            }
        }

        // Sort by price
        allHotels.sort((a, b) => a.price - b.price);

        return {
            timestamp: new Date().toISOString(),
            date: checkinDate,
            hotels: allHotels,
            isPartial: !fullFetch
        };
    },

    /**
     * Fetch data for a date range with progress tracking
     */
    async fetchDateRange(dates, progressCallback = null, options = {}) {
        const { fullFetch = false, stopOnLimit = true } = options;
        const results = {};
        const total = dates.length;
        let completed = 0;
        let errors = [];
        let limitReached = false;

        // Check account status first
        const accountStatus = await this.checkAccount();
        if (accountStatus.success) {
            console.log(`API Credits: ${accountStatus.remainingLimit} remaining of ${accountStatus.requestLimit}`);
            
            const estimatedCalls = this.estimateCalls(dates.length, fullFetch);
            if (estimatedCalls > accountStatus.remainingLimit) {
                console.warn(`Warning: Need ~${estimatedCalls} calls, have ${accountStatus.remainingLimit}`);
            }
        }

        for (const date of dates) {
            if (limitReached && stopOnLimit) {
                errors.push({ date, error: 'Skipped - API limit reached' });
                continue;
            }

            try {
                const data = await this.fetchDateData(date, fullFetch);
                results[date] = data;
                completed++;

                if (progressCallback) {
                    progressCallback({
                        completed,
                        total,
                        currentDate: date,
                        percentage: Math.round((completed / total) * 100),
                        hotelsFound: data.hotels.length,
                        callsUsed: this.callsThisSession,
                        limitReached: false
                    });
                }

                // Rate limiting between dates
                if (completed < total) {
                    await this.delay(400);
                }

            } catch (error) {
                if (error.message === 'API_LIMIT_REACHED') {
                    limitReached = true;
                    errors.push({ date, error: 'API limit reached' });
                    
                    if (progressCallback) {
                        progressCallback({
                            completed,
                            total,
                            currentDate: date,
                            percentage: Math.round((completed / total) * 100),
                            error: 'API LIMIT REACHED',
                            limitReached: true
                        });
                    }
                    
                    if (stopOnLimit) break;
                } else if (error.message === 'API_KEY_INVALID') {
                    errors.push({ date, error: 'Invalid API key' });
                    if (progressCallback) {
                        progressCallback({
                            completed, total, currentDate: date,
                            error: 'Invalid API key - check Settings'
                        });
                    }
                    break;
                } else {
                    errors.push({ date, error: error.message });
                    if (progressCallback) {
                        progressCallback({
                            completed, total, currentDate: date,
                            percentage: Math.round((completed / total) * 100),
                            error: error.message
                        });
                    }
                }
            }
        }

        return { 
            results, 
            errors, 
            limitReached,
            callsUsed: this.callsThisSession,
            datesCompleted: Object.keys(results).length,
            datesSkipped: dates.length - Object.keys(results).length
        };
    },

    /**
     * Smart update - fetches data efficiently within API limits
     */
    async smartUpdate(progressCallback = null, options = {}) {
        const {
            fullFetch = false,
            maxCalls = 25,
            startDate = null,
            numDays = null
        } = options;

        this.callsThisSession = 0;

        // Check account first
        const account = await this.checkAccount();
        let availableCalls = maxCalls;
        
        if (account.success) {
            availableCalls = Math.min(maxCalls, account.remainingLimit);
            console.log(`Smart Update: ${availableCalls} calls available`);
        }

        // Calculate how many dates we can fetch
        const callsPerDate = fullFetch ? 3 : 1;
        const maxDates = Math.floor(availableCalls / callsPerDate);
        const datesToFetch = numDays ? Math.min(numDays, maxDates) : maxDates;

        // Generate date list starting from May 1, 2026
        const dates = [];
        const start = startDate ? new Date(startDate + 'T00:00:00') : new Date(2026, 4, 1);

        for (let i = 0; i < datesToFetch; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            dates.push(formatDateForAPI(date));
        }

        console.log(`Fetching ${dates.length} dates (est. ${dates.length * callsPerDate} calls)`);

        const result = await this.fetchDateRange(dates, progressCallback, { 
            fullFetch, 
            stopOnLimit: true 
        });

        // Save whatever we got
        if (Object.keys(result.results).length > 0) {
            const existingData = Storage.loadData() || { dates: {} };
            Object.assign(existingData.dates, result.results);
            existingData.lastFullUpdate = new Date().toISOString();
            existingData.totalHotels = this.countUniqueHotels(existingData.dates);
            existingData.isDemo = false;
            existingData.isPartial = result.limitReached || result.datesSkipped > 0;
            Storage.saveData(existingData);
            Storage.setLastUpdate();
        }

        return {
            success: !result.limitReached && result.errors.length === 0,
            datesUpdated: result.datesCompleted,
            datesSkipped: result.datesSkipped,
            callsUsed: result.callsUsed,
            limitReached: result.limitReached,
            errors: result.errors
        };
    },

    /**
     * Full update for all configured months
     */
    async fullUpdate(progressCallback = null, options = {}) {
        const { fullFetch = false } = options;
        const { startMonth, startYear, monthsToCollect } = CONFIG.dateRange;
        const allDates = [];

        for (let i = 0; i < monthsToCollect; i++) {
            let month = startMonth + i;
            let year = startYear;
            
            if (month > 12) {
                month = month - 12;
                year = year + 1;
            }

            allDates.push(...getDatesInMonth(year, month));
        }

        this.callsThisSession = 0;

        const result = await this.fetchDateRange(allDates, progressCallback, { 
            fullFetch,
            stopOnLimit: true 
        });

        // Save collected data
        if (Object.keys(result.results).length > 0) {
            const existingData = Storage.loadData() || { dates: {} };
            Object.assign(existingData.dates, result.results);
            existingData.lastFullUpdate = new Date().toISOString();
            existingData.totalHotels = this.countUniqueHotels(existingData.dates);
            existingData.isDemo = false;
            existingData.isPartial = result.limitReached;
            Storage.saveData(existingData);
            Storage.setLastUpdate();
        }

        return {
            success: !result.limitReached && result.errors.length === 0,
            datesUpdated: result.datesCompleted,
            datesSkipped: result.datesSkipped,
            callsUsed: result.callsUsed,
            limitReached: result.limitReached,
            errors: result.errors,
            message: result.limitReached 
                ? `API limit reached after ${result.datesCompleted} dates. Data saved.`
                : `Successfully updated ${result.datesCompleted} dates.`
        };
    },

    /**
     * Test fetch for a single date
     */
    async testFetch(checkinDate, fullFetch = false) {
        console.log(`Testing API fetch for ${checkinDate}...`);
        this.callsThisSession = 0;
        
        try {
            const data = await this.fetchDateData(checkinDate, fullFetch);
            console.log(`✓ Found ${data.hotels.length} hotels (${this.callsThisSession} API calls)`);
            
            // Check for your hotels and competitors
            const yourHotels = data.hotels.filter(h => isYourHotel(h.name));
            const competitors = data.hotels.filter(h => isTrackedCompetitor(h.name));
            
            console.log('Your hotels:', yourHotels);
            console.log('Tracked competitors:', competitors);
            
            return data;
        } catch (error) {
            console.error('Test failed:', error.message);
            throw error;
        }
    },

    /**
     * Count unique hotels across all dates
     */
    countUniqueHotels(datesData) {
        const hotelIds = new Set();
        
        Object.values(datesData).forEach(dateData => {
            if (dateData && dateData.hotels) {
                dateData.hotels.forEach(hotel => {
                    if (hotel.hotelId) {
                        hotelIds.add(hotel.hotelId);
                    }
                });
            }
        });

        return hotelIds.size;
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    getSessionStats() {
        return {
            callsThisSession: this.callsThisSession,
            lastKnownLimit: this.lastKnownLimit,
            lastKnownRemaining: this.lastKnownRemaining
        };
    }
};

/**
 * Demo Data Generator - Only generates your 15 tracked hotels
 */
const DemoData = {
    // Your 15 tracked hotels with realistic base prices
    trackedHotels: [
        { name: 'Riviera Motel', hotelId: 1162889, basePrice: 85, rating: 3.5, reviews: 185, category: 'yours' },
        { name: 'American Boutique Inn', hotelId: 564648, basePrice: 92, rating: 4.0, reviews: 312, category: 'yours' },
        { name: 'Super 8 by Wyndham Mackinaw City Bridgeview', hotelId: 234567, basePrice: 75, rating: 3.0, reviews: 420, category: 'competitor' },
        { name: 'Vindel Motel', hotelId: 345678, basePrice: 70, rating: 3.5, reviews: 156, category: 'competitor' },
        { name: 'Lighthouse View Motel', hotelId: 456789, basePrice: 88, rating: 4.0, reviews: 234, category: 'competitor' },
        { name: 'Parkside Inn Bridgeview', hotelId: 567890, basePrice: 82, rating: 3.5, reviews: 189, category: 'competitor' },
        { name: 'Rainbow Motel', hotelId: 678901, basePrice: 68, rating: 3.0, reviews: 145, category: 'competitor' },
        { name: 'Days Inn by Wyndham Mackinaw City', hotelId: 789012, basePrice: 79, rating: 3.5, reviews: 567, category: 'competitor' },
        { name: 'Comfort Inn Lakeside', hotelId: 890123, basePrice: 95, rating: 4.0, reviews: 423, category: 'competitor' },
        { name: 'Quality Inn & Suites', hotelId: 901234, basePrice: 89, rating: 3.5, reviews: 389, category: 'competitor' },
        { name: 'Baymont by Wyndham Mackinaw City', hotelId: 112233, basePrice: 77, rating: 3.5, reviews: 298, category: 'competitor' },
        { name: 'Holiday Inn Express', hotelId: 223344, basePrice: 115, rating: 4.5, reviews: 512, category: 'competitor' },
        { name: 'Hampton Inn Mackinaw City', hotelId: 334455, basePrice: 125, rating: 4.5, reviews: 478, category: 'competitor' },
        { name: 'Econo Lodge', hotelId: 445566, basePrice: 65, rating: 3.0, reviews: 234, category: 'competitor' },
        { name: "America's Best Value Inn", hotelId: 556677, basePrice: 62, rating: 2.5, reviews: 167, category: 'competitor' }
    ],

    vendors: ['Booking.com', 'Expedia.com', 'Hotels.com', 'Priceline', 'Agoda.com'],

    generateHotelData(date, seasonMultiplier = 1) {
        const hotels = [];
        const isWeekend = [0, 5, 6].includes(new Date(date).getDay());
        const weekendBoost = isWeekend ? 18 : 0;

        this.trackedHotels.forEach(hotel => {
            const variance = (Math.random() - 0.5) * 20; // +/- $10 variance
            const price = Math.round((hotel.basePrice * seasonMultiplier) + variance + weekendBoost);

            hotels.push({
                name: hotel.name,
                hotelId: hotel.hotelId,
                price: Math.max(45, price),
                vendor: this.vendors[Math.floor(Math.random() * this.vendors.length)],
                rating: hotel.rating,
                reviewCount: hotel.reviews,
                category: hotel.category
            });
        });

        // Sort by price
        hotels.sort((a, b) => a.price - b.price);

        return {
            timestamp: new Date().toISOString(),
            date: date,
            hotels: hotels
        };
    },

    generateMonthData(year, month) {
        const dates = getDatesInMonth(year, month);
        const results = {};

        // Seasonal multipliers (peak summer = higher prices)
        const seasonMultipliers = { 5: 1.0, 6: 1.25, 7: 1.5, 8: 1.45, 9: 1.1, 10: 0.95 };
        const multiplier = seasonMultipliers[month] || 1;

        dates.forEach(date => {
            results[date] = this.generateHotelData(date, multiplier);
        });

        return results;
    },

    generateAllData() {
        const { startMonth, startYear, monthsToCollect } = CONFIG.dateRange;
        const allData = { dates: {} };

        for (let i = 0; i < monthsToCollect; i++) {
            let month = startMonth + i;
            let year = startYear;
            
            if (month > 12) {
                month -= 12;
                year += 1;
            }

            Object.assign(allData.dates, this.generateMonthData(year, month));
        }

        allData.lastFullUpdate = new Date().toISOString();
        allData.totalHotels = 15; // Only our tracked hotels
        allData.isDemo = true;

        return allData;
    }
};
