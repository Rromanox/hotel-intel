/**
 * Mackinaw Intel - API Module
 * Handles MakCorp API integration for hotel data collection
 * 
 * API Docs: https://docs.makcorps.com
 * Endpoint: https://api.makcorps.com/city
 */

const API = {
    /**
     * Build the API URL for a specific check-in date
     */
    buildUrl(checkinDate, checkoutDate, pagination = 0) {
        const settings = Storage.loadSettings();
        const apiKey = settings.apiKey || CONFIG.api.apiKey;
        
        const params = new URLSearchParams({
            api_key: apiKey,
            cityid: CONFIG.api.cityId,
            pagination: String(pagination),
            cur: CONFIG.api.params.cur,
            rooms: CONFIG.api.params.rooms,
            adults: CONFIG.api.params.adults,
            checkin: checkinDate,
            checkout: checkoutDate
        });

        return `${CONFIG.api.baseUrl}?${params.toString()}`;
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
        
        // Remove $ and commas, then parse
        const cleaned = String(priceStr).replace(/[$,]/g, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    },

    /**
     * Extract hotel data from API response item
     * Maps MakCorps response format to our internal format
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

        // Skip hotels without prices
        if (!lowestPrice) return null;

        return {
            name: item.name,
            hotelId: item.hotelId || null,
            price: lowestPrice,
            vendor: lowestVendor,
            rating: item.reviews?.rating || null,
            reviewCount: item.reviews?.count || null,
            // We're not storing these to save space, but they're available:
            // telephone: item.telephone || null,
            // coordinates: item.geocode ? [item.geocode.latitude, item.geocode.longitude] : null
        };
    },

    /**
     * Fetch hotel data for a specific date (all pages)
     */
    async fetchDateData(checkinDate, progressCallback = null) {
        const checkoutDate = this.getCheckoutDate(checkinDate);
        const allHotels = [];
        let currentPage = 0;
        let hasMorePages = true;

        while (hasMorePages && currentPage < 5) { // Max 5 pages (150 hotels) safety limit
            const url = this.buildUrl(checkinDate, checkoutDate, currentPage);

            try {
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                // API returns an array, last item contains pagination info
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

                // Process hotel data (exclude pagination info)
                const hotelsData = paginationInfo ? data.slice(0, -1) : data;
                
                for (const item of hotelsData) {
                    // Skip if it's the pagination array
                    if (Array.isArray(item)) continue;
                    
                    const hotel = this.extractHotelData(item);
                    if (hotel) {
                        allHotels.push(hotel);
                    }
                }

                // Check if there are more pages
                if (paginationInfo) {
                    const totalPages = paginationInfo.totalpageCount || 1;
                    currentPage++;
                    hasMorePages = currentPage < totalPages;
                } else {
                    // No pagination info, assume single page
                    hasMorePages = false;
                }

                // Rate limiting between pages
                if (hasMorePages) {
                    await this.delay(300);
                }

            } catch (error) {
                console.error(`Error fetching page ${currentPage} for ${checkinDate}:`, error);
                throw error;
            }
        }

        // Sort by price
        allHotels.sort((a, b) => a.price - b.price);

        return {
            timestamp: new Date().toISOString(),
            date: checkinDate,
            hotels: allHotels
        };
    },

    /**
     * Fetch data for a date range with progress tracking
     */
    async fetchDateRange(dates, progressCallback = null) {
        const results = {};
        const total = dates.length;
        let completed = 0;
        let errors = [];

        for (const date of dates) {
            try {
                const data = await this.fetchDateData(date);
                results[date] = data;
                completed++;

                if (progressCallback) {
                    progressCallback({
                        completed,
                        total,
                        currentDate: date,
                        percentage: Math.round((completed / total) * 100),
                        hotelsFound: data.hotels.length
                    });
                }

                // Rate limiting - wait between dates
                if (completed < total) {
                    await this.delay(500);
                }

            } catch (error) {
                errors.push({ date, error: error.message });
                completed++;
                
                if (progressCallback) {
                    progressCallback({
                        completed,
                        total,
                        currentDate: date,
                        percentage: Math.round((completed / total) * 100),
                        error: error.message
                    });
                }
            }
        }

        return { results, errors };
    },

    /**
     * Fetch data for an entire month
     */
    async fetchMonthData(year, month, progressCallback = null) {
        const dates = getDatesInMonth(year, month);
        return this.fetchDateRange(dates, progressCallback);
    },

    /**
     * Perform a full update for all configured months
     */
    async fullUpdate(progressCallback = null) {
        const { startMonth, startYear, monthsToCollect } = CONFIG.dateRange;
        const allDates = [];

        // Collect all dates for all months
        for (let i = 0; i < monthsToCollect; i++) {
            let month = startMonth + i;
            let year = startYear;
            
            if (month > 12) {
                month = month - 12;
                year = year + 1;
            }

            allDates.push(...getDatesInMonth(year, month));
        }

        const { results, errors } = await this.fetchDateRange(allDates, progressCallback);

        // Save to storage
        const existingData = Storage.loadData() || { dates: {} };
        
        // Merge new results with existing data
        Object.assign(existingData.dates, results);
        existingData.lastFullUpdate = new Date().toISOString();
        existingData.totalHotels = this.countUniqueHotels(existingData.dates);
        existingData.isDemo = false; // Mark as real data

        Storage.saveData(existingData);
        Storage.setLastUpdate();

        return {
            success: errors.length === 0,
            datesUpdated: Object.keys(results).length,
            errors
        };
    },

    /**
     * Fetch data for a single date (for testing)
     */
    async testFetch(checkinDate) {
        console.log(`Testing API fetch for ${checkinDate}...`);
        
        try {
            const data = await this.fetchDateData(checkinDate);
            console.log(`Success! Found ${data.hotels.length} hotels`);
            console.log('Sample hotels:', data.hotels.slice(0, 3));
            return data;
        } catch (error) {
            console.error('Test fetch failed:', error);
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

    /**
     * Delay helper for rate limiting
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Check API connectivity and credits
     */
    async checkAccount() {
        const settings = Storage.loadSettings();
        const apiKey = settings.apiKey || CONFIG.api.apiKey;
        
        try {
            const response = await fetch(`https://api.makcorps.com/account?api_key=${apiKey}`);
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    requestLimit: data.requestLimit,
                    requestUsed: data.requestUsed,
                    remainingLimit: data.remainingLimit
                };
            }
            return { success: false, error: 'Invalid API key' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

/**
 * Demo data generator for testing when API is unavailable
 */
const DemoData = {
    hotelNames: [
        'Riviera Motel',
        'American Boutique Inn',
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
        'Parkview Inn',
        'Harbor Springs Hotel',
        'Straits Area Resort',
        'Wilderness Lodge',
        'Birchwood Inn',
        'Lighthouse Point Hotel',
        'Fort Mackinaw Inn',
        'Victorian Inn',
        'Comfort Stay Motel',
        'Grand View Suites',
        'Lakeshore Hotel',
        'Mackinaw City Inn',
        'Budget Inn Express',
        'Quality Inn Lakeside',
        'Days Inn Mackinaw',
        'Super 8 Bridge View',
        'Holiday Inn Express',
        'Hampton Inn Mackinaw',
        'Best Western Lakefront',
        'Ramada by Wyndham',
        'Fairfield Inn Mackinaw',
        'Courtyard by Marriott',
        'SpringHill Suites',
        'Baymont Inn',
        'La Quinta Inn',
        'Sleep Inn & Suites',
        'Country Inn & Suites',
        'Econo Lodge Straits',
        'Motel 6 Mackinaw',
        'Travelodge by Wyndham',
        'Americas Best Value Inn',
        'Knights Inn Mackinaw',
        'Rodeway Inn Bridge',
        'Clarion Hotel Beachfront',
        'Comfort Suites Lakeside',
        'Crown Choice Inn',
        'Bell\'s Melody Motel',
        'Thunderbird Inn',
        'Nicolet Inn',
        'Starlight Budget Inn',
        'Chief Motel',
        'Parkside Inn',
        'Great Lakes Inn',
        'Nor\' Gate Motel',
        'Rainbow Motel',
        'Chippewa Motor Lodge',
        'Hamilton Inn',
        'Cabins of Mackinaw',
        'Clearwater Lakeshore',
        'Beach House Cottages',
        'Brigadoon B&B'
    ],

    vendors: ['Booking.com', 'Expedia.com', 'Hotels.com', 'Priceline', 'Agoda.com', 'Trip.com'],

    generateHotelData(date, basePrice = 85) {
        const hotels = [];
        const usedNames = new Set();
        const numHotels = 55 + Math.floor(Math.random() * 10); // 55-64 hotels

        // Always include your hotels first with specific IDs
        hotels.push({
            name: 'Riviera Motel',
            hotelId: 1162889,
            price: Math.round(basePrice + (Math.random() * 20) - 10 + (new Date(date).getDay() >= 5 ? 15 : 0)),
            vendor: this.vendors[Math.floor(Math.random() * this.vendors.length)],
            rating: 3.5 + Math.random() * 0.5,
            reviewCount: 180 + Math.floor(Math.random() * 100)
        });
        usedNames.add('Riviera Motel');

        hotels.push({
            name: 'American Boutique Inn',
            hotelId: 564648,
            price: Math.round(basePrice + 5 + (Math.random() * 20) - 10 + (new Date(date).getDay() >= 5 ? 15 : 0)),
            vendor: this.vendors[Math.floor(Math.random() * this.vendors.length)],
            rating: 4.0 + Math.random() * 0.5,
            reviewCount: 280 + Math.floor(Math.random() * 150)
        });
        usedNames.add('American Boutique Inn');

        // Generate remaining hotels
        for (let i = hotels.length; i < numHotels; i++) {
            let name;
            do {
                name = this.hotelNames[Math.floor(Math.random() * this.hotelNames.length)];
            } while (usedNames.has(name));
            
            usedNames.add(name);

            const variance = (Math.random() - 0.5) * 80;
            const dayVariance = (new Date(date).getDay() >= 5 ? 20 : 0);
            const price = Math.round(basePrice + variance + dayVariance);

            hotels.push({
                name: name,
                hotelId: 100000 + i + Math.floor(Math.random() * 10000),
                price: Math.max(49, price),
                vendor: this.vendors[Math.floor(Math.random() * this.vendors.length)],
                rating: 2.5 + Math.random() * 2.5,
                reviewCount: 10 + Math.floor(Math.random() * 500)
            });
        }

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

        // Base price varies by month (peak season = higher)
        const monthPrices = {
            5: 89,   // May
            6: 115,  // June
            7: 139,  // July (peak)
            8: 135,  // August
            9: 99    // September
        };

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
                month = month - 12;
                year = year + 1;
            }

            const monthData = this.generateMonthData(year, month);
            Object.assign(allData.dates, monthData);
        }

        allData.lastFullUpdate = new Date().toISOString();
        allData.totalHotels = 64;
        allData.isDemo = true;

        return allData;
    }
};
