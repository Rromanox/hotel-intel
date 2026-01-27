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
     */
    extractHotelData(item) {
        if (!item || !item.name) return null;

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
            reviewCount: item.reviews?.count || null
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
 * Demo Data Generator - For testing without API calls
 */
const DemoData = {
    hotelNames: [
        'Riviera Motel',
        'American Boutique Inn',
        'Super 8 by Wyndham Mackinaw City Bridgeview',
        'Vindel Motel',
        'Lighthouse View Motel',
        'Parkside Inn Bridgeview',
        'Rainbow Motel',
        'Mackinaw Beach Hotel',
        'Bridge View Lodge',
        'Northern Lights Inn',
        'Lakefront Resort',
        'Captain\'s Quarters',
        'Historic Mackinaw Hotel',
        'Pine Grove Motel',
        'Waterfront Suites',
        'Sunset Bay Resort',
        'Colonial House Inn',
        'Mackinaw Motor Lodge',
        'Harbor Springs Hotel',
        'Straits Area Resort',
        'Wilderness Lodge',
        'Birchwood Inn',
        'Fort Mackinaw Inn',
        'Victorian Inn',
        'Comfort Stay Motel',
        'Grand View Suites',
        'Lakeshore Hotel',
        'Mackinaw City Inn',
        'Budget Inn Express',
        'Quality Inn Lakeside',
        'Days Inn Mackinaw',
        'Holiday Inn Express',
        'Hampton Inn Mackinaw',
        'Best Western Lakefront',
        'Ramada by Wyndham',
        'Fairfield Inn Mackinaw',
        'Courtyard by Marriott',
        'Baymont Inn',
        'La Quinta Inn',
        'Sleep Inn & Suites'
    ],

    vendors: ['Booking.com', 'Expedia.com', 'Hotels.com', 'Priceline', 'Agoda.com'],

    generateHotelData(date, basePrice = 85) {
        const hotels = [];
        const usedNames = new Set();
        const numHotels = 30 + Math.floor(Math.random() * 10);
        const isWeekend = [0, 5, 6].includes(new Date(date).getDay());
        const weekendBoost = isWeekend ? 20 : 0;

        // Your hotels first
        hotels.push({
            name: 'Riviera Motel',
            hotelId: 1162889,
            price: Math.round(basePrice + (Math.random() * 15) - 5 + weekendBoost),
            vendor: this.vendors[Math.floor(Math.random() * this.vendors.length)],
            rating: 3.5,
            reviewCount: 185
        });
        usedNames.add('Riviera Motel');

        hotels.push({
            name: 'American Boutique Inn',
            hotelId: 564648,
            price: Math.round(basePrice + 8 + (Math.random() * 15) - 5 + weekendBoost),
            vendor: this.vendors[Math.floor(Math.random() * this.vendors.length)],
            rating: 4.0,
            reviewCount: 312
        });
        usedNames.add('American Boutique Inn');

        // Competitors with realistic names
        const competitorPrices = {
            'Super 8 by Wyndham Mackinaw City Bridgeview': basePrice - 10,
            'Vindel Motel': basePrice - 5,
            'Lighthouse View Motel': basePrice + 5,
            'Parkside Inn Bridgeview': basePrice,
            'Rainbow Motel': basePrice - 8
        };

        Object.entries(competitorPrices).forEach(([name, price]) => {
            hotels.push({
                name: name,
                hotelId: 100000 + Math.floor(Math.random() * 900000),
                price: Math.round(price + (Math.random() * 20) - 10 + weekendBoost),
                vendor: this.vendors[Math.floor(Math.random() * this.vendors.length)],
                rating: 3 + Math.random() * 1.5,
                reviewCount: 50 + Math.floor(Math.random() * 300)
            });
            usedNames.add(name);
        });

        // Fill rest with random hotels
        for (let i = hotels.length; i < numHotels; i++) {
            let name;
            do {
                name = this.hotelNames[Math.floor(Math.random() * this.hotelNames.length)];
            } while (usedNames.has(name));
            
            usedNames.add(name);

            hotels.push({
                name: name,
                hotelId: 100000 + Math.floor(Math.random() * 900000),
                price: Math.max(49, Math.round(basePrice + (Math.random() - 0.5) * 60 + weekendBoost)),
                vendor: this.vendors[Math.floor(Math.random() * this.vendors.length)],
                rating: 2.5 + Math.random() * 2.5,
                reviewCount: 10 + Math.floor(Math.random() * 400)
            });
        }

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

        // Seasonal base prices
        const monthPrices = { 5: 89, 6: 115, 7: 139, 8: 135, 9: 99 };
        const basePrice = monthPrices[month] || 100;

        dates.forEach(date => {
            results[date] = this.generateHotelData(date, basePrice);
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
        allData.totalHotels = 40;
        allData.isDemo = true;

        return allData;
    }
};
