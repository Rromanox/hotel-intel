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

                // Rate limiting - shorter delay for faster fetching
                if (completed < dates.length) {
                    await this.delay(200);
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
     * Fetch data for a specific month
     */
    async fetchMonth(year, month, progressCallback = null) {
        const dates = getDatesInMonth(year, month);
        return await this.fetchDateRange(dates, progressCallback, { stopOnLimit: true });
    },

    /**
     * Fetch multiple dates in parallel (faster!)
     */
    async fetchDatesParallel(dates, batchSize = 3, progressCallback = null) {
        const results = {};
        const errors = [];
        let completed = 0;
        let limitReached = false;

        this.callsThisSession = 0;

        // Process in batches
        for (let i = 0; i < dates.length; i += batchSize) {
            if (limitReached) break;

            const batch = dates.slice(i, i + batchSize);
            
            // Fetch batch in parallel
            const promises = batch.map(date => 
                this.fetchDateData(date)
                    .then(data => ({ date, data, success: true }))
                    .catch(error => ({ date, error: error.message, success: false }))
            );

            const batchResults = await Promise.all(promises);

            for (const result of batchResults) {
                if (result.success && result.data.hotels?.length > 0) {
                    results[result.date] = result.data;
                } else if (result.error === 'API_LIMIT_REACHED') {
                    limitReached = true;
                    errors.push({ date: result.date, error: 'API limit reached' });
                } else if (!result.success) {
                    errors.push({ date: result.date, error: result.error });
                }
                completed++;
            }

            if (progressCallback) {
                progressCallback({
                    completed,
                    total: dates.length,
                    percentage: Math.round((completed / dates.length) * 100),
                    callsUsed: this.callsThisSession,
                    limitReached
                });
            }

            // Small delay between batches (not between each request)
            if (i + batchSize < dates.length && !limitReached) {
                await this.delay(200);
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
    },

    // ============================================
    // DATABASE SYNC FUNCTIONS
    // ============================================

    /**
     * Load all rates from database
     */
    async loadFromDatabase() {
        try {
            console.log('📥 Loading data from database...');
            const response = await fetch(CONFIG.api.ratesUrl);
            const data = await response.json();

            if (data.success && data.dates) {
                console.log(`✅ Loaded ${data.count} dates from database`);
                return data.dates;
            }
            return null;
        } catch (error) {
            console.error('❌ Database load error:', error.message);
            return null;
        }
    },

    /**
     * Save rates to database
     */
    async saveToDatabase(dateData) {
        try {
            const response = await fetch(CONFIG.api.ratesUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dateData)
            });
            const result = await response.json();
            if (result.success) {
                console.log(`💾 Saved ${dateData.date} to database`);
            }
            return result.success;
        } catch (error) {
            console.error('❌ Database save error:', error.message);
            return false;
        }
    },

    /**
     * Save multiple dates to database
     */
    async saveBulkToDatabase(dates) {
        try {
            const response = await fetch(`${CONFIG.api.ratesUrl}/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dates })
            });
            const result = await response.json();
            if (result.success) {
                console.log(`💾 Bulk saved ${result.datesUpdated} dates to database`);
            }
            return result.success;
        } catch (error) {
            console.error('❌ Database bulk save error:', error.message);
            return false;
        }
    },

    /**
     * Sync local storage with database
     */
    async syncWithDatabase() {
        // Load from database
        const dbData = await this.loadFromDatabase();
        
        if (dbData && Object.keys(dbData).length > 0) {
            // Merge with local data (database takes priority for same dates)
            const localData = Storage.loadData() || { dates: {} };
            const mergedDates = { ...localData.dates, ...dbData };
            
            localData.dates = mergedDates;
            localData.isDemo = false;
            localData.dataVersion = '2.0';
            Storage.saveData(localData);
            
            console.log(`🔄 Synced: ${Object.keys(mergedDates).length} total dates`);
            return true;
        }
        return false;
    }
};
