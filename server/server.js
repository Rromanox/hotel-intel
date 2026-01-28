/**
 * Mackinaw Intel - API Proxy Server with MongoDB
 * - Proxies requests to SearchAPI.io (Google Hotels)
 * - Stores rate data in MongoDB for cross-device sync
 */

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 10000;

// Environment variables
const SEARCHAPI_KEY = process.env.SEARCHAPI_KEY || process.env.SERPAPI_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

// Mackinaw City bounding box [min_lng, min_lat, max_lng, max_lat]
const MACKINAW_BOUNDING_BOX = '[-84.78,45.77,-84.71,45.80]';

// MongoDB connection
let db = null;
let ratesCollection = null;
let historyCollection = null;

async function connectDB() {
    if (!MONGODB_URI) {
        console.log('⚠️ No MongoDB URI - running without database');
        return;
    }
    
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db('hotelintel');
        ratesCollection = db.collection('rates');
        historyCollection = db.collection('rates_history');
        
        // Create indexes for fast lookups
        await ratesCollection.createIndex({ date: 1 }, { unique: true });
        await historyCollection.createIndex({ date: 1, timestamp: 1 });
        
        console.log('✅ Connected to MongoDB (rates + history)');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
    }
}

// CORS configuration
app.use(cors({
    origin: [
        'https://rromanox.github.io',
        'http://localhost:3000',
        'http://127.0.0.1:5500'
    ],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '5mb' }));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'Mackinaw Intel API (SearchAPI.io + MongoDB)',
        hasApiKey: !!SEARCHAPI_KEY,
        hasDatabase: !!db
    });
});

// ============================================
// SEARCHAPI.IO ENDPOINTS
// ============================================

/**
 * Fetch hotels from SearchAPI.io
 * GET /api/hotels?checkin=2026-05-10&checkout=2026-05-11
 * 
 * Uses bounding box to only get Mackinaw City hotels
 * (excludes St. Ignace and Mackinac Island)
 */
app.get('/api/hotels', async (req, res) => {
    if (!SEARCHAPI_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const { checkin, checkout, adults = 2 } = req.query;

    if (!checkin || !checkout) {
        return res.status(400).json({ error: 'checkin and checkout dates required' });
    }

    // Convert date format from YYYY-MM-DD to YYYY-M-D (SearchAPI format)
    const formatDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-');
        return `${year}-${parseInt(month)}-${parseInt(day)}`;
    };

    try {
        const params = new URLSearchParams({
            engine: 'google_hotels',
            bounding_box: MACKINAW_BOUNDING_BOX,
            check_in_date: formatDate(checkin),
            check_out_date: formatDate(checkout),
            adults: adults,
            currency: 'USD',
            gl: 'us',
            hl: 'en',
            api_key: SEARCHAPI_KEY
        });

        const url = `https://www.searchapi.io/api/v1/search?${params}`;
        console.log(`📡 Fetching: ${checkin}`);

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('SearchAPI Error:', data.error);
            return res.status(400).json({ error: data.error });
        }

        const properties = data.properties || [];
        console.log(`   Found ${properties.length} hotels in Mackinaw City`);

        // Check if our hotels are in results
        const hasAmerican = properties.some(p => 
            p.name?.toLowerCase().includes('american boutique'));
        const hasRiviera = properties.some(p => 
            p.name?.toLowerCase().includes('riviera'));
        
        console.log(`   American Boutique: ${hasAmerican ? '✅' : '❌'}, Riviera: ${hasRiviera ? '✅' : '❌'}`);

        // Transform properties to consistent format
        // Use price_before_taxes when available (base room rate without taxes/fees)
        const transformedProperties = properties.map(p => {
            // Prefer price_before_taxes, fallback to regular price
            const priceBeforeTax = p.price_per_night?.extracted_price_before_taxes 
                || p.total_price?.extracted_price_before_taxes;
            const priceWithTax = p.price_per_night?.extracted_price 
                || p.total_price?.extracted_price;
            
            // Use before-tax price if available, otherwise use with-tax price
            const basePrice = priceBeforeTax || priceWithTax || 0;
            
            return {
                name: p.name,
                price: basePrice,
                priceWithTax: priceWithTax || 0,
                priceBeforeTax: priceBeforeTax || null,
                rating: p.rating || 0,
                reviews: p.reviews || 0,
                hotel_class: p.extracted_hotel_class || 0,
                amenities: p.amenities || [],
                gps_coordinates: p.gps_coordinates,
                property_token: p.property_token,
                link: p.link,
                // Deal information
                deal: p.deal || null,                    // e.g., "19% less than usual"
                dealDescription: p.deal_description || null,  // e.g., "Deal"
                // Keep original rate_per_night for compatibility
                rate_per_night: {
                    lowest: basePrice,
                    price: p.price_per_night?.price_before_taxes || p.price_per_night?.price || null
                }
            };
        });

        // Log price comparison for debugging
        const sampleHotel = transformedProperties.find(p => p.priceBeforeTax);
        if (sampleHotel) {
            console.log(`   💰 Sample: ${sampleHotel.name.substring(0, 25)} - Before tax: $${sampleHotel.priceBeforeTax}, With tax: $${sampleHotel.priceWithTax}`);
        }
        
        // Log deals
        const dealsCount = transformedProperties.filter(p => p.deal).length;
        if (dealsCount > 0) {
            console.log(`   🏷️ ${dealsCount} hotels with deals`);
        }

        res.json({
            success: true,
            date: checkin,
            properties: transformedProperties,
            pagination: data.pagination,
            search_metadata: data.search_metadata
        });

    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Check SearchAPI.io account status
 * GET /api/account
 * 
 * Note: SearchAPI.io doesn't have a direct account endpoint,
 * so we return a simplified status
 */
app.get('/api/account', async (req, res) => {
    if (!SEARCHAPI_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        // SearchAPI.io doesn't have an account info endpoint
        // Return a basic response indicating the key is configured
        res.json({
            success: true,
            plan: 'SearchAPI.io',
            searchesPerMonth: 100,
            searchesUsed: 'N/A - Check SearchAPI.io dashboard',
            searchesRemaining: 'N/A - Check SearchAPI.io dashboard',
            accountEmail: 'N/A',
            note: 'Visit https://www.searchapi.io/dashboard for usage details'
        });

    } catch (error) {
        console.error('Account check error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DATABASE ENDPOINTS
// ============================================

/**
 * Save rate data for a date (with history tracking)
 * POST /api/rates
 * Body: { date: "2026-05-10", hotels: [...], timestamp: "..." }
 * 
 * If rates have changed from previous save, old data is archived to history
 */
app.post('/api/rates', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    const { date, hotels, timestamp } = req.body;

    if (!date || !hotels) {
        return res.status(400).json({ error: 'date and hotels required' });
    }

    try {
        // Check if we have existing data for this date
        const existingData = await ratesCollection.findOne({ date });
        let savedToHistory = false;
        
        if (existingData && existingData.hotels && existingData.hotels.length > 0) {
            // Compare rates to see if they changed
            const hasChanges = checkForRateChanges(existingData.hotels, hotels);
            
            if (hasChanges && historyCollection) {
                // Save old data to history
                await historyCollection.insertOne({
                    date,
                    hotels: existingData.hotels,
                    timestamp: existingData.timestamp,
                    archivedAt: new Date()
                });
                savedToHistory = true;
                console.log(`📜 Archived old rates for ${date} to history`);
            }
        }

        // Save new data
        const result = await ratesCollection.updateOne(
            { date },
            { 
                $set: { 
                    date,
                    hotels,
                    timestamp: timestamp || new Date().toISOString(),
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );

        console.log(`💾 Saved rates for ${date}: ${hotels.length} hotels${savedToHistory ? ' (history updated)' : ''}`);
        res.json({ success: true, date, hotelsCount: hotels.length, savedToHistory });

    } catch (error) {
        console.error('Save error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Helper function to check if rates have changed
 */
function checkForRateChanges(oldHotels, newHotels) {
    // Build price maps for comparison
    const oldPrices = {};
    oldHotels.forEach(h => {
        if (h.name && h.price) {
            oldPrices[h.name.toLowerCase()] = h.price;
        }
    });
    
    const newPrices = {};
    newHotels.forEach(h => {
        if (h.name && h.price) {
            newPrices[h.name.toLowerCase()] = h.price;
        }
    });
    
    // Check for any price differences
    for (const [name, oldPrice] of Object.entries(oldPrices)) {
        const newPrice = newPrices[name];
        if (newPrice && newPrice !== oldPrice) {
            console.log(`   Rate change detected: ${name} $${oldPrice} → $${newPrice}`);
            return true;
        }
    }
    
    // Check for new hotels
    for (const name of Object.keys(newPrices)) {
        if (!oldPrices[name]) {
            console.log(`   New hotel detected: ${name}`);
            return true;
        }
    }
    
    // Check for removed hotels
    for (const name of Object.keys(oldPrices)) {
        if (!newPrices[name]) {
            console.log(`   Hotel removed: ${name}`);
            return true;
        }
    }
    
    return false;
}

/**
 * Save multiple dates at once
 * POST /api/rates/bulk
 * Body: { dates: { "2026-05-10": {...}, "2026-05-11": {...} } }
 */
app.post('/api/rates/bulk', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    const { dates } = req.body;

    if (!dates || typeof dates !== 'object') {
        return res.status(400).json({ error: 'dates object required' });
    }

    try {
        const operations = Object.entries(dates).map(([date, data]) => ({
            updateOne: {
                filter: { date },
                update: { 
                    $set: { 
                        date,
                        hotels: data.hotels || [],
                        timestamp: data.timestamp || new Date().toISOString(),
                        updatedAt: new Date()
                    }
                },
                upsert: true
            }
        }));

        const result = await ratesCollection.bulkWrite(operations);
        console.log(`💾 Bulk saved ${operations.length} dates`);
        
        res.json({ 
            success: true, 
            datesUpdated: result.upsertedCount + result.modifiedCount 
        });

    } catch (error) {
        console.error('Bulk save error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get database summary - list all dates and counts
 * GET /api/rates/summary
 * NOTE: This must come BEFORE /api/rates/:date to avoid matching "summary" as a date
 */
app.get('/api/rates/summary', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    try {
        // Get all dates with hotel counts
        const data = await ratesCollection.find({}, { 
            projection: { date: 1, 'hotels': 1, updatedAt: 1 } 
        }).sort({ date: 1 }).toArray();
        
        // Group by month
        const byMonth = {};
        data.forEach(item => {
            const month = item.date.substring(0, 7); // "2026-05"
            if (!byMonth[month]) {
                byMonth[month] = { dates: [], totalHotels: 0 };
            }
            byMonth[month].dates.push({
                date: item.date,
                hotelCount: item.hotels?.length || 0,
                updatedAt: item.updatedAt
            });
            byMonth[month].totalHotels += item.hotels?.length || 0;
        });

        res.json({ 
            success: true, 
            totalDates: data.length,
            byMonth,
            allDates: data.map(d => d.date)
        });

    } catch (error) {
        console.error('Summary error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get rate history for a specific date
 * GET /api/rates/history/:date
 */
app.get('/api/rates/history/:date', async (req, res) => {
    if (!historyCollection) {
        return res.status(503).json({ error: 'History not available' });
    }

    const { date } = req.params;

    try {
        const history = await historyCollection
            .find({ date })
            .sort({ archivedAt: -1 })
            .toArray();
        
        res.json({ 
            success: true, 
            date,
            historyCount: history.length,
            history 
        });

    } catch (error) {
        console.error('History fetch error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get rate data for a specific date
 * GET /api/rates/:date
 */
app.get('/api/rates/:date', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    const { date } = req.params;

    try {
        const data = await ratesCollection.findOne({ date });
        
        if (!data) {
            return res.status(404).json({ error: 'No data for this date' });
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('Fetch error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get all rate data
 * GET /api/rates
 * Query params: ?from=2026-05-01&to=2026-05-31
 */
app.get('/api/rates', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    const { from, to } = req.query;

    try {
        let query = {};
        
        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = from;
            if (to) query.date.$lte = to;
        }

        const data = await ratesCollection.find(query).sort({ date: 1 }).toArray();
        
        // Convert to object format { "2026-05-10": {...}, ... }
        const dates = {};
        data.forEach(item => {
            dates[item.date] = {
                date: item.date,
                hotels: item.hotels,
                timestamp: item.timestamp,
                isDemo: false
            };
        });

        res.json({ 
            success: true, 
            count: data.length,
            dates 
        });

    } catch (error) {
        console.error('Fetch all error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete rate data for a date
 * DELETE /api/rates/:date
 */
app.delete('/api/rates/:date', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    const { date } = req.params;

    try {
        const result = await ratesCollection.deleteOne({ date });
        res.json({ success: true, deleted: result.deletedCount > 0 });

    } catch (error) {
        console.error('Delete error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Clear all rate data
 * DELETE /api/rates
 */
app.delete('/api/rates', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    try {
        const result = await ratesCollection.deleteMany({});
        console.log(`🗑️ Cleared all rates: ${result.deletedCount} documents`);
        res.json({ success: true, deleted: result.deletedCount });

    } catch (error) {
        console.error('Clear error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// AUTO-REFRESH ENDPOINT (for daily cron job)
// ============================================

/**
 * Auto-refresh all dates from May to October 2026
 * GET /api/auto-refresh
 * GET /api/auto-refresh?key=YOUR_SECRET_KEY (optional security)
 * 
 * This endpoint fetches rates for all dates in the season
 * and saves them to MongoDB. Designed to be called by a cron job.
 */
app.get('/api/auto-refresh', async (req, res) => {
    const startTime = Date.now();
    const secretKey = process.env.REFRESH_SECRET;
    
    // Optional security: require a secret key
    if (secretKey && req.query.key !== secretKey) {
        return res.status(401).json({ error: 'Invalid or missing key' });
    }
    
    if (!SEARCHAPI_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }
    
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    console.log('🔄 AUTO-REFRESH STARTED:', new Date().toISOString());
    
    // Define the season: May 1 - October 31, 2026
    const startDate = new Date('2026-05-01');
    const endDate = new Date('2026-10-31');
    
    const dates = [];
    let current = new Date(startDate);
    while (current <= endDate) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    
    console.log(`📅 Fetching ${dates.length} dates (May 1 - Oct 31, 2026)`);
    
    const results = {
        total: dates.length,
        success: 0,
        failed: 0,
        errors: [],
        hotelsPerDay: []
    };
    
    // Helper function to fetch a single date
    const fetchDate = async (dateStr) => {
        const [year, month, day] = dateStr.split('-');
        const checkin = `${year}-${parseInt(month)}-${parseInt(day)}`;
        const checkoutDate = new Date(dateStr);
        checkoutDate.setDate(checkoutDate.getDate() + 1);
        const checkout = `${checkoutDate.getFullYear()}-${checkoutDate.getMonth() + 1}-${checkoutDate.getDate()}`;
        
        try {
            const params = new URLSearchParams({
                engine: 'google_hotels',
                bounding_box: MACKINAW_BOUNDING_BOX,
                check_in_date: checkin,
                check_out_date: checkout,
                adults: 2,
                currency: 'USD',
                gl: 'us',
                hl: 'en',
                api_key: SEARCHAPI_KEY
            });

            const url = `https://www.searchapi.io/api/v1/search?${params}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const properties = data.properties || [];
            
            // Transform properties
            const hotels = properties.map(p => {
                const priceBeforeTax = p.price_per_night?.extracted_price_before_taxes 
                    || p.total_price?.extracted_price_before_taxes;
                const priceWithTax = p.price_per_night?.extracted_price 
                    || p.total_price?.extracted_price;
                const basePrice = priceBeforeTax || priceWithTax || 0;
                
                return {
                    name: p.name,
                    price: basePrice,
                    priceWithTax: priceWithTax || 0,
                    priceBeforeTax: priceBeforeTax || null,
                    rating: p.rating || null,
                    reviews: p.reviews || 0,
                    hotel_class: p.extracted_hotel_class || 0,
                    deal: p.deal || null,
                    dealDescription: p.deal_description || null
                };
            });
            
            // Save to database (same logic as POST /api/rates)
            const timestamp = new Date().toISOString();
            const existing = await ratesCollection.findOne({ date: dateStr });
            
            if (existing) {
                // Archive old data to history
                await historyCollection.insertOne({
                    date: dateStr,
                    hotels: existing.hotels,
                    timestamp: existing.timestamp,
                    archivedAt: timestamp
                });
            }
            
            // Upsert current data
            await ratesCollection.updateOne(
                { date: dateStr },
                { 
                    $set: { 
                        date: dateStr,
                        hotels: hotels,
                        timestamp: timestamp,
                        hotelCount: hotels.length
                    }
                },
                { upsert: true }
            );
            
            return { success: true, hotels: hotels.length };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    };
    
    // Process dates in batches to avoid rate limiting
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds
    
    for (let i = 0; i < dates.length; i += BATCH_SIZE) {
        const batch = dates.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(dates.length / BATCH_SIZE);
        
        console.log(`   Batch ${batchNum}/${totalBatches}: ${batch[0]} to ${batch[batch.length - 1]}`);
        
        // Process batch in parallel
        const batchResults = await Promise.all(batch.map(fetchDate));
        
        batchResults.forEach((result, idx) => {
            if (result.success) {
                results.success++;
                results.hotelsPerDay.push(result.hotels);
            } else {
                results.failed++;
                results.errors.push({ date: batch[idx], error: result.error });
            }
        });
        
        // Delay between batches (except for last batch)
        if (i + BATCH_SIZE < dates.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgHotels = results.hotelsPerDay.length > 0 
        ? Math.round(results.hotelsPerDay.reduce((a, b) => a + b, 0) / results.hotelsPerDay.length)
        : 0;
    
    console.log('✅ AUTO-REFRESH COMPLETE:');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Success: ${results.success}/${results.total}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Avg hotels/day: ${avgHotels}`);
    
    res.json({
        success: true,
        message: 'Auto-refresh complete',
        timestamp: new Date().toISOString(),
        duration: `${duration}s`,
        results: {
            total: results.total,
            success: results.success,
            failed: results.failed,
            avgHotelsPerDay: avgHotels
        },
        errors: results.errors.length > 0 ? results.errors.slice(0, 10) : [] // Only show first 10 errors
    });
});

/**
 * Auto-refresh status/test endpoint
 * GET /api/auto-refresh/status
 */
app.get('/api/auto-refresh/status', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        // Get latest refresh timestamp
        const latest = await ratesCollection.findOne({}, { sort: { timestamp: -1 } });
        const count = await ratesCollection.countDocuments();
        
        // Count dates by month
        const pipeline = [
            {
                $group: {
                    _id: { $substr: ['$date', 0, 7] },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ];
        const monthCounts = await ratesCollection.aggregate(pipeline).toArray();
        
        res.json({
            success: true,
            database: {
                totalDates: count,
                lastRefresh: latest?.timestamp || 'Never',
                byMonth: monthCounts.reduce((acc, m) => {
                    acc[m._id] = m.count;
                    return acc;
                }, {})
            },
            endpoint: '/api/auto-refresh',
            note: 'Call /api/auto-refresh to trigger a full refresh of all dates'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🏨 Mackinaw Intel Server running on port ${PORT}`);
        console.log(`   SearchAPI: ${SEARCHAPI_KEY ? '✅' : '❌'}`);
        console.log(`   MongoDB: ${db ? '✅' : '❌'}`);
    });
});
