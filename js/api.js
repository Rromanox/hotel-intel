/**
 * Mackinaw Intel - API Module
 * Handles MakCorp API integration for hotel data collection
 * 
 * API Documentation: https://docs.makcorps.com/hotel-price-apis/hotel-api-search-by-city-id
 */

const API = {
    /**
     * Build the API URL for a specific check-in date
     */
    buildUrl(checkinDate, checkoutDate, pagination = 0) {
        const params = new URLSearchParams({
            api_key: CONFIG.api.apiKey,
            cityid: CONFIG.api.cityId,
            pagination: pagination.toString(),
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
     * Fetch hotel data for a specific date (all pages)
     */
    async fetchDateData(checkinDate, progressCallback = null) {
        const checkoutDate = this.getCheckoutDate(checkinDate);
        let allHotels = [];
        let currentPage = 0;
        let totalPages = 1;

        try {
            // Fetch first page to get total count
            const firstPageData = await this.fetchPage(checkinDate, checkoutDate, 0);
            
            if (firstPageData.hotels.length > 0) {
                allHotels = firstPageData.hotels;
                totalPages = firstPageData.totalPages || 1;
            }

            // Fetch remaining pages if more than 30 hotels
            for (let page = 1; page < totalPages && page < 10; page++) { // Cap at 10 pages (~300 hotels)
                await this.delay(300); // Rate limiting
                const pageData = await this.fetchPage(checkinDate, checkoutDate, page);
                if (pageData.hotels.length > 0) {
                    allHotels = allHotels.concat(pageData.hotels);
                }
            }

            // Sort all hotels by lowest price
            allHotels.sort((a, b) => {
                if (!a.price) return 1;
                if (!b.price) return -1;
                return a.price - b.price;
            });

            return {
                timestamp: new Date().toISOString(),
                date: checkinDate,
                hotels: allHotels,
                totalHotels: allHotels.length
            };

        } catch (error) {
            console.error(`Error fetching data for ${checkinDate}:`, error);
            throw error;
        }
    },

    /**
     * Fetch a single page of results
     */
    async fetchPage(checkinDate, checkoutDate, pagination) {
        const url = this.buildUrl(checkinDate, checkoutDate, pagination);

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseResponse(data, checkinDate);
    },

    /**
     * Parse API response and normalize hotel data
     * 
     * MakCorps returns an array where:
     * - Most items are hotel objects with vendor1/price1, vendor2/price2, etc.
     * - The last item is an array with pagination info
     */
    parseResponse(apiResponse, checkinDate) {
        const hotels = [];
        let totalPages = 1;
        let totalHotels = 0;

        if (!apiResponse || !Array.isArray(apiResponse)) {
            console.warn('Unexpected API response format:', apiResponse);
            return { hotels: [], totalPages: 1 };
        }

        apiResponse.forEach(item => {
            // Check if this is the pagination info array
            if (Array.isArray(item) && item.length > 0 && item[0].totalHotelCount !== undefined) {
                totalHotels = item[0].totalHotelCount || 0;
                totalPages = item[0].totalpageCount || 1;
                return;
            }

            // Parse hotel data
            const hotel = this.extractHotelData(item);
            if (hotel) {
                hotels.push(hotel);
            }
        });

        return { hotels, totalPages, totalHotels };
    },

    /**
     * Extract hotel data from API response item
     * 
     * MakCorps format:
     * {
     *   name: "Hotel Name",
     *   hotelId: 12345,
     *   telephone: "+1 555-555-5555",
     *   geocode: { latitude: 45.786, longitude: -84.727 },
     *   reviews: { rating: 4.5, count: 1234 },
     *   vendor1: "Booking.com",
     *   price1: "$215",
     *   vendor2: "Expedia",
     *   price2: "$220",
     *   ...
     * }
     */
    extractHotelData(item) {
        if (!item || typeof item !== 'object') return null;
        if (!item.name) return null;

        // Find the lowest price among all vendors (up to 4)
        let lowestPrice = null;
        let lowestVendor = null;
        let allPrices = [];

        for (let i = 1; i <= 4; i++) {
            const vendorKey = `vendor${i}`;
            const priceKey = `price${i}`;
            
            if (item[vendorKey] && item[priceKey]) {
                const price = this.parsePrice(item[priceKey]);
                if (price && price > 0) {
                    allPrices.push({ vendor: item[vendorKey], price });
                    
                    if (lowestPrice === null || price < lowestPrice) {
                        lowestPrice = price;
                        lowestVendor = item[vendorKey];
                    }
                }
            }
        }

        // Skip hotels without any price
        if (lowestPrice === null) {
            return null;
        }

        // Extract coordinates
        let coordinates = null;
        if (item.geocode) {
            coordinates = [item.geocode.latitude, item.geocode.longitude];
        }

        // Extract reviews
        let rating = null;
        let reviewCount = null;
        if (item.reviews) {
            rating = item.reviews.rating || null;
            reviewCount = item.reviews.count || null;
        }

        return {
            name: item.name,
            hotelId: item.hotelId,
            price: lowestPrice,
            vendor: lowestVendor,
            allPrices: allPrices, // Keep all vendor prices for comparison
            rating: rating,
            reviewCount: reviewCount,
            coordinates: coordinates,
            phone: item.telephone || null
        };
    },

    /**
     * Parse price from string format like "$215" or "€180"
     */
    parsePrice(priceValue) {
        if (typeof priceValue === 'number') return priceValue;
        if (typeof priceValue === 'string') {
            // Remove currency symbols, commas, and spaces
            const cleaned = priceValue.replace(/[^0-9.]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? null : parsed;
        }
        return null;
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
                        percentage: Math.round((completed / total) * 100)
                    });
                }

                // Rate limiting - wait between date requests
                if (completed < total) {
                    await this.delay(800); // 800ms between dates
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
     * Check API connectivity
     */
    async testConnection() {
        try {
            const testDate = formatDateForAPI(new Date(2026, 4, 15)); // May 15, 2026
            const checkoutDate = this.getCheckoutDate(testDate);
            const url = this.buildUrl(testDate, checkoutDate, 0);

            const response = await fetch(url);
            return response.ok;
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    }
};

/**
 * Demo data generator for testing when API is unavailable
 * Generates realistic data matching MakCorps response patterns
 */
const DemoData = {
    hotelNames: [
        'Riviera Motel',
        'American Boutique Inn',
        'Mackinaw Beach & Dive Resort',
        'Bridge View Inn',
        'Northern Lights Motel',
        'Lakefront Resort & Suites',
        'Captains Quarters Motel',
        'Historic Mackinaw Hotel',
        'Pine Grove Motel',
        'Waterfront Suites',
        'Sunset Bay Resort',
        'Colonial House Inn',
        'Mackinaw Motor Lodge',
        'Parkview Inn & Suites',
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
        'Holiday Inn Express Mackinaw',
        'Hampton Inn Mackinaw City',
        'Best Western Lakefront',
        'Ramada by Wyndham Mackinaw',
        'Fairfield Inn & Suites',
        'Courtyard Mackinaw City',
        'SpringHill Suites Mackinaw',
        'Baymont Inn & Suites',
        'La Quinta Inn',
        'Sleep Inn & Suites',
        'Country Inn & Suites',
        'Econo Lodge Lakeview',
        'Rodeway Inn',
        'Travelodge Mackinaw',
        'Americas Best Value Inn',
        'Knights Inn',
        'Clearwater Lakeshore Motel',
        'Beachcomber Motel',
        'Chippewa Motor Lodge',
        'North Country Inn',
        'Mackinac Lakefront Cabins',
        'Thunderbird Inn',
        'Chief Motel',
        'Nor Gate Motel',
        'Star Lite Motel',
        'Bella Vista Motel',
        'Paradise Bay Motel',
        'Great Lakes Inn',
        'Voyageur Motel',
        'Cedarville Inn',
        'Straits Lodge',
        'Hamilton Inn',
        'Huron Motor Lodge',
        'Mackinac Crossings Resort',
        'Brigadoon B&B'
    ],

    vendors: ['Booking.com', 'Expedia', 'Hotels.com', 'Priceline', 'Agoda', 'Trip.com', 'Direct'],

    generateHotelData(date, basePrice = 85) {
        const hotels = [];
        const usedNames = new Set();
        const numHotels = 45 + Math.floor(Math.random() * 20); // 45-64 hotels

        // Determine day of week for weekend pricing
        const dayOfWeek = new Date(date + 'T00:00:00').getDay();
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday

        // Always include your hotels first with consistent positioning
        const yourHotelNames = Object.keys(CONFIG.yourHotels);
        yourHotelNames.forEach((name, index) => {
            const baseRate = basePrice + (index * 5); // Slight difference between your properties
            const weekendBump = isWeekend ? 20 : 0;
            const variance = (Math.random() - 0.5) * 15;
            
            const price = Math.round(baseRate + weekendBump + variance);
            
            hotels.push({
                name: name,
                hotelId: CONFIG.yourHotels[name].id,
                price: price,
                vendor: this.vendors[Math.floor(Math.random() * this.vendors.length)],
                allPrices: [
                    { vendor: 'Booking.com', price: price },
                    { vendor: 'Expedia', price: price + Math.round(Math.random() * 10) },
                    { vendor: 'Hotels.com', price: price + Math.round(Math.random() * 15) }
                ],
                rating: 3.8 + Math.random() * 0.7,
                reviewCount: 200 + Math.floor(Math.random() * 350),
                coordinates: [45.786095 + (Math.random() - 0.5) * 0.01, -84.72728 + (Math.random() - 0.5) * 0.01],
                phone: '+1 231-436-' + String(5000 + Math.floor(Math.random() * 5000)).padStart(4, '0')
            });
            usedNames.add(name);
        });

        // Generate remaining hotels with varied pricing
        for (let i = hotels.length; i < numHotels; i++) {
            let name;
            do {
                name = this.hotelNames[Math.floor(Math.random() * this.hotelNames.length)];
            } while (usedNames.has(name));
            
            usedNames.add(name);

            // Create price variance - some budget, some premium
            const tierRandom = Math.random();
            let priceMultiplier;
            if (tierRandom < 0.25) {
                priceMultiplier = 0.6 + Math.random() * 0.2; // Budget tier
            } else if (tierRandom < 0.75) {
                priceMultiplier = 0.85 + Math.random() * 0.3; // Mid tier
            } else {
                priceMultiplier = 1.2 + Math.random() * 0.5; // Premium tier
            }

            const weekendBump = isWeekend ? 15 + Math.random() * 15 : 0;
            const price = Math.round(basePrice * priceMultiplier + weekendBump);

            hotels.push({
                name: name,
                hotelId: 1000000 + i + Math.floor(Math.random() * 100000),
                price: Math.max(49, price), // Minimum $49
                vendor: this.vendors[Math.floor(Math.random() * this.vendors.length)],
                allPrices: [
                    { vendor: 'Booking.com', price: Math.max(49, price) },
                    { vendor: 'Expedia', price: Math.max(49, price + Math.round((Math.random() - 0.3) * 15)) }
                ],
                rating: 2.5 + Math.random() * 2.5,
                reviewCount: 10 + Math.floor(Math.random() * 600),
                coordinates: [45.786095 + (Math.random() - 0.5) * 0.03, -84.72728 + (Math.random() - 0.5) * 0.03],
                phone: '+1 231-436-' + String(1000 + Math.floor(Math.random() * 9000)).padStart(4, '0')
            });
        }

        // Sort by price
        hotels.sort((a, b) => a.price - b.price);

        return {
            timestamp: new Date().toISOString(),
            date: date,
            hotels: hotels,
            totalHotels: hotels.length
        };
    },

    generateMonthData(year, month) {
        const dates = getDatesInMonth(year, month);
        const results = {};

        // Base price varies by month (peak season = higher)
        const monthPrices = {
            5: 89,    // May - shoulder season
            6: 119,   // June - busy
            7: 145,   // July - peak
            8: 139,   // August - peak
            9: 99     // September - shoulder
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
