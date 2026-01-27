/**
 * Mackinaw Intel - API Module
 * Handles MakCorp API integration for hotel data collection
 */

const API = {
    /**
     * Build the API URL for a specific check-in date
     */
    buildUrl(checkinDate, checkoutDate) {
        const params = new URLSearchParams({
            api_key: CONFIG.api.apiKey,
            cityid: CONFIG.api.cityId,
            pagination: CONFIG.api.params.pagination,
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
     * Fetch hotel data for a specific date
     */
    async fetchDateData(checkinDate, progressCallback = null) {
        const checkoutDate = this.getCheckoutDate(checkinDate);
        const url = this.buildUrl(checkinDate, checkoutDate);

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Parse and normalize the response
            return this.parseResponse(data, checkinDate);

        } catch (error) {
            console.error(`Error fetching data for ${checkinDate}:`, error);
            throw error;
        }
    },

    /**
     * Parse API response and normalize hotel data
     */
    parseResponse(apiResponse, checkinDate) {
        const hotels = [];
        
        // The API returns an array of hotels
        if (!apiResponse || !Array.isArray(apiResponse)) {
            console.warn('Unexpected API response format:', apiResponse);
            return { timestamp: new Date().toISOString(), date: checkinDate, hotels: [] };
        }

        apiResponse.forEach(item => {
            // Each item should have hotel info
            const hotel = this.extractHotelData(item);
            if (hotel) {
                hotels.push(hotel);
            }
        });

        // Sort by price
        hotels.sort((a, b) => {
            if (!a.price) return 1;
            if (!b.price) return -1;
            return a.price - b.price;
        });

        return {
            timestamp: new Date().toISOString(),
            date: checkinDate,
            hotels: hotels
        };
    },

    /**
     * Extract hotel data from API response item
     */
    extractHotelData(item) {
        if (!item) return null;

        // Handle different API response structures
        const hotel = {
            name: item.name || item.hotelName || item.hotel_name || null,
            hotelId: item.hotelId || item.hotel_id || item.id || null,
            price: null,
            vendor: null,
            rating: item.rating || item.stars || null,
            reviewCount: item.reviewCount || item.review_count || item.reviews || null,
            coordinates: null,
            phone: item.phone || null,
            address: item.address || null,
            amenities: item.amenities || []
        };

        // Extract price from various possible structures
        if (item.price1) {
            hotel.price = this.parsePrice(item.price1);
            hotel.vendor = item.vendor1 || 'Unknown';
        } else if (item.price) {
            hotel.price = this.parsePrice(item.price);
            hotel.vendor = item.vendor || 'Unknown';
        } else if (item.rates && Array.isArray(item.rates) && item.rates.length > 0) {
            // Find lowest rate
            const rates = item.rates
                .map(r => ({ price: this.parsePrice(r.price || r.rate), vendor: r.vendor || r.source }))
                .filter(r => r.price && r.price > 0)
                .sort((a, b) => a.price - b.price);
            
            if (rates.length > 0) {
                hotel.price = rates[0].price;
                hotel.vendor = rates[0].vendor;
            }
        }

        // Extract coordinates
        if (item.coordinates) {
            hotel.coordinates = item.coordinates;
        } else if (item.latitude && item.longitude) {
            hotel.coordinates = [item.latitude, item.longitude];
        } else if (item.geo) {
            hotel.coordinates = [item.geo.lat, item.geo.lon];
        }

        // Skip hotels without name or price
        if (!hotel.name || !hotel.price) {
            return null;
        }

        return hotel;
    },

    /**
     * Parse price from various formats
     */
    parsePrice(priceValue) {
        if (typeof priceValue === 'number') return priceValue;
        if (typeof priceValue === 'string') {
            // Remove currency symbols and parse
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

                // Rate limiting - wait between requests
                if (completed < total) {
                    await this.delay(500); // 500ms between requests
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
            const testDate = formatDateForAPI(new Date());
            const checkoutDate = this.getCheckoutDate(testDate);
            const url = this.buildUrl(testDate, checkoutDate);

            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    }
};

// Demo data generator for testing when API is unavailable
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
        'Country Inn & Suites'
    ],

    vendors: ['Booking.com', 'Expedia', 'Hotels.com', 'Priceline', 'Agoda', 'Direct'],

    generateHotelData(date, basePrice = 85) {
        const hotels = [];
        const usedNames = new Set();
        const numHotels = 40 + Math.floor(Math.random() * 25); // 40-64 hotels

        // Always include your hotels first
        const yourHotelNames = Object.keys(CONFIG.yourHotels);
        yourHotelNames.forEach((name, index) => {
            const baseRate = basePrice + (Math.random() * 30) - 15;
            const dayVariance = (new Date(date).getDay() >= 5 ? 15 : 0); // Weekend bump
            
            hotels.push({
                name: name,
                hotelId: CONFIG.yourHotels[name].id,
                price: Math.round(baseRate + dayVariance + (Math.random() * 20)),
                vendor: this.vendors[Math.floor(Math.random() * this.vendors.length)],
                rating: 3.5 + Math.random() * 1.5,
                reviewCount: 150 + Math.floor(Math.random() * 400)
            });
            usedNames.add(name);
        });

        // Generate remaining hotels
        for (let i = hotels.length; i < numHotels; i++) {
            let name;
            do {
                name = this.hotelNames[Math.floor(Math.random() * this.hotelNames.length)];
            } while (usedNames.has(name));
            
            usedNames.add(name);

            const variance = (Math.random() - 0.5) * 100;
            const dayVariance = (new Date(date).getDay() >= 5 ? 20 : 0);
            const price = Math.round(basePrice + variance + dayVariance);

            hotels.push({
                name: name,
                hotelId: 100000 + i,
                price: Math.max(45, price), // Minimum $45
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
            5: 85,   // May
            6: 110,  // June
            7: 135,  // July (peak)
            8: 130,  // August
            9: 95    // September
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
